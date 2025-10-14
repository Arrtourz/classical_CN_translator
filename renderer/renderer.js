// 渲染进程主文件
const { ipcRenderer } = require('electron');

class TranslationApp {
    constructor() {
        this.isTranslating = false;
        this.currentConfig = {};
        this.translationModule = null;
        this.shouldAutoScroll = true; // 跟踪是否应该自动滚动
        this.isAborted = false; // 跟踪翻译是否被中断

        // 语言映射表
        this.languageMap = {
            chinese: {
                // 主界面
                appTitle: '古文翻译器',
                inputHeader: '原文',
                outputHeader: '译文',
                inputPlaceholder: '请输入古文内容，或使用 Alt+Q 截图识别...',
                outputPlaceholder: '翻译结果将在这里显示',

                // 工具栏按钮
                settingsTitle: '设置',
                themeTitle: '切换主题',
                screenshotTitle: '截图翻译 (Alt+Q)',
                translateTitle: '翻译 (Ctrl+Enter)',
                stopTitle: '停止 (Ctrl+Enter)',

                // 设置面板
                settingsHeader: '设置',
                apiConfigHeader: 'API 配置',
                apiKeyLabel: 'DeepSeek API 密钥',
                apiKeyPlaceholder: 'sk-...',
                testBtnText: '测试',
                apiHelpText: '请前往 DeepSeek Platform 获取API密钥',

                translationOptionsHeader: '翻译选项',
                modelLabel: '翻译模型',
                modelStandard: '标准模式 (deepseek-chat)',
                modelReasoner: '推理模式 (deepseek-reasoner)',
                languageLabel: '语言',

                ocrSettingsHeader: 'OCR 设置',
                textLayoutLabel: '文本布局',
                textLayoutHorizontal: '横排文本 (左向右)',
                textLayoutVertical: '竖排文本 (右向左，古籍)',
                textLayoutHelp: '竖排模式适用于古籍文献，文本框顺序从右向左排列',

                functionsHeader: '功能选项',
                memoryLabel: '记忆功能',
                memoryHelp: '保持对话上下文记忆（最多16000 tokens）',
                autoTranslateLabel: '自动翻译',
                autoTranslateHelp: '输入文本后自动开始翻译',

                clearHistoryBtn: '清空历史记录',

                // 状态文本
                connecting: '测试中...',
                connected: '连接成功',
                connectionFailed: '连接失败',

                // 窗口控制按钮
                minimizeTitle: '最小化',
                maximizeTitle: '最大化',
                restoreTitle: '还原',
                closeTitle: '关闭'
            },
            english: {
                // 主界面
                appTitle: 'Classical Chinese Translator',
                inputHeader: 'Original Text',
                outputHeader: 'Translation',
                inputPlaceholder: 'Enter classical Chinese text, or use Alt+Q for screenshot OCR...',
                outputPlaceholder: 'Translation results will appear here',

                // 工具栏按钮
                settingsTitle: 'Settings',
                themeTitle: 'Toggle Theme',
                screenshotTitle: 'Screenshot OCR (Alt+Q)',
                translateTitle: 'Translate (Ctrl+Enter)',
                stopTitle: 'Stop (Ctrl+Enter)',

                // 设置面板
                settingsHeader: 'Settings',
                apiConfigHeader: 'API Configuration',
                apiKeyLabel: 'DeepSeek API Key',
                apiKeyPlaceholder: 'sk-...',
                testBtnText: 'Test',
                apiHelpText: 'Please visit DeepSeek Platform to obtain API key',

                translationOptionsHeader: 'Translation Options',
                modelLabel: 'Translation Model',
                modelStandard: 'Standard Mode (deepseek-chat)',
                modelReasoner: 'Reasoning Mode (deepseek-reasoner)',
                languageLabel: 'Language',

                ocrSettingsHeader: 'OCR Settings',
                textLayoutLabel: 'Text Layout',
                textLayoutHorizontal: 'Horizontal Text (Left to Right)',
                textLayoutVertical: 'Vertical Text (Right to Left, Ancient)',
                textLayoutHelp: 'Vertical mode is suitable for ancient texts, with text box order from right to left',

                functionsHeader: 'Function Options',
                memoryLabel: 'Memory Function',
                memoryHelp: 'Maintain conversation context memory (up to 16000 tokens)',
                autoTranslateLabel: 'Auto Translate',
                autoTranslateHelp: 'Automatically start translation after text input',

                clearHistoryBtn: 'Clear History',

                // 状态文本
                connecting: 'Testing...',
                connected: 'Connected',
                connectionFailed: 'Connection Failed',

                // 窗口控制按钮
                minimizeTitle: 'Minimize',
                maximizeTitle: 'Maximize',
                restoreTitle: 'Restore',
                closeTitle: 'Close'
            }
        };

        this.initializeElements();
        this.attachEventListeners();
        this.setupOCRListener();
        this.loadConfiguration();
        this.initializeTranslationModule();
    }

    initializeElements() {
        // 主要元素
        this.inputText = document.getElementById('inputText');
        this.outputContent = document.getElementById('outputContent');
        this.outputPlaceholder = document.getElementById('outputPlaceholder');
        this.translationResult = document.getElementById('translationResult');
        
        // 按钮
        this.translateBtn = document.getElementById('translateBtn');
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.themeToggle = document.getElementById('themeToggle');
        
        // 设置面板
        this.settingsPanel = document.getElementById('settingsPanel');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.testApiBtn = document.getElementById('testApiBtn');
        this.modelSelect = document.getElementById('modelSelect');
        this.languageSelect = document.getElementById('languageSelect');
        this.textLayoutSelect = document.getElementById('textLayoutSelect');
        this.enableHistoryToggle = document.getElementById('enableHistoryToggle');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.autoTranslateToggle = document.getElementById('autoTranslateToggle');
        this.deepseekLink = document.getElementById('deepseekLink');

        // 状态元素
        this.statusIndicator = document.getElementById('statusIndicator');

        // 窗口控制按钮
        this.minimizeBtn = document.getElementById('minimizeBtn');
        this.maximizeBtn = document.getElementById('maximizeBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.titlebarDragArea = document.getElementById('titlebarDragArea');
    }

    attachEventListeners() {
        // 翻译功能
        this.translateBtn.addEventListener('click', () => this.handleTranslateToggle());
        this.inputText.addEventListener('input', () => this.handleInputChange());
        this.inputText.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleTranslateToggle();
            }
        });

        // 工具按钮
        this.screenshotBtn.addEventListener('click', () => this.handleScreenshot());

        // 设置面板
        this.settingsBtn.addEventListener('click', () => this.toggleSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.toggleSettings());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // 设置项
        this.testApiBtn.addEventListener('click', () => this.testApiConnection());
        this.apiKeyInput.addEventListener('input', () => this.updateApiKey());
        this.modelSelect.addEventListener('change', () => this.updateModel());
        this.languageSelect.addEventListener('change', () => this.updateLanguage());
        this.textLayoutSelect.addEventListener('change', () => this.updateTextLayout());
        this.enableHistoryToggle.addEventListener('change', () => this.updateHistoryToggle());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.autoTranslateToggle.addEventListener('change', () => this.updateAutoTranslateToggle());
        this.deepseekLink.addEventListener('click', (e) => this.handleDeepSeekLink(e));

        // 窗口控制
        this.minimizeBtn.addEventListener('click', () => this.handleWindowMinimize());
        this.maximizeBtn.addEventListener('click', () => this.handleWindowMaximize());
        this.closeBtn.addEventListener('click', () => this.handleWindowClose());

        // 滚动监听器 - 检测用户是否手动滚动
        this.outputContent.addEventListener('scroll', () => this.handleScroll());

        // IPC监听
        ipcRenderer.on('ocr-started', () => {
            this.updateStatus('正在识别文字...', 'loading');
        });

        ipcRenderer.on('ocr-result', (event, data) => {
            this.handleOCRResult(data);
        });

        ipcRenderer.on('config-updated', (event, config) => {
            this.currentConfig = config;
            this.updateSettingsUI();
        });

        // 流式翻译进度监听
        ipcRenderer.on('translation-progress', (event, progressData) => {
            this.handleTranslationProgress(progressData);
        });

        // 窗口事件
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    async initializeTranslationModule() {
        try {
            this.updateStatus('初始化中...', 'loading');
            
            // 添加重试机制等待主进程IPC处理器准备好
            const result = await this.retryIPC('initialize-translation', null, 5, 500);
            
            if (result.success) {
                this.updateStatus('就绪', 'ready');
            } else {
                this.updateStatus('初始化失败', 'error');
                console.error('Translation module initialization failed:', result.error);
            }
            
        } catch (error) {
            this.updateStatus('初始化失败', 'error');
            console.error('Failed to initialize translation module:', error);
        }
    }

    async loadConfiguration() {
        try {
            const config = await this.retryIPC('get-config', null, 5, 500);
            this.currentConfig = config;
            this.updateSettingsUI();
            this.applyTheme(config.darkMode);
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    }

    updateSettingsUI() {
        const config = this.currentConfig;
        
        // API设置
        if (config.apiKey) {
            this.apiKeyInput.value = config.apiKey;
        }
        
        // 翻译设置
        this.modelSelect.value = config.translateModel || 'chat';
        this.languageSelect.value = config.outputLanguage || 'english';
        this.textLayoutSelect.value = config.textLayout || 'horizontal';

        // 更新界面语言
        this.updateInterfaceLanguage(config.outputLanguage || 'english');

        // 功能开关
        this.enableHistoryToggle.checked = config.enableHistory || false;
        this.autoTranslateToggle.checked = config.autoTranslate !== false;
    }

    async handleInputChange() {
        const text = this.inputText.value;

        // 自动翻译
        if (this.currentConfig.autoTranslate && text.trim() && !this.isTranslating) {
            // 防抖：延迟翻译
            clearTimeout(this.autoTranslateTimeout);
            this.autoTranslateTimeout = setTimeout(() => {
                this.handleTranslate();
            }, 1000);
        }
    }

    handleTranslateToggle() {
        if (this.isTranslating) {
            this.stopTranslation();
        } else {
            this.handleTranslate();
        }
    }

    async stopTranslation() {
        this.isAborted = true;

        try {
            // 调用后端中断API
            await ipcRenderer.invoke('abort-translation');
        } catch (error) {
            console.error('Abort translation error:', error);
        }

        this.setTranslatingState(false);
        this.updateStatus('翻译已停止', 'ready');
    }

    async handleTranslate() {
        const text = this.inputText.value.trim();
        if (!text || this.isTranslating) return;

        try {
            // 重置中断和自动滚动状态
            this.isAborted = false;
            this.shouldAutoScroll = true;

            this.setTranslatingState(true);
            this.updateStatus('翻译中...', 'loading');
            
            // 准备流式显示界面
            this.prepareStreamingDisplay();

            // 通过IPC调用流式翻译
            const result = await ipcRenderer.invoke('translate-text', {
                text: text,
                stream: true
            });

            if (result.success) {
                this.finalizeTranslationResult(result);
                this.updateStatus('翻译完成', 'ready');
            } else {
                this.showError('翻译失败: ' + result.error);
                this.updateStatus('翻译失败', 'error');
            }

        } catch (error) {
            // 如果是用户主动中断，不显示错误弹窗
            if (this.isAborted || error.message.includes('aborted')) {
                console.log('Translation stopped by user');
                this.updateStatus('翻译已停止', 'ready');
            } else {
                this.showError('翻译出错: ' + error.message);
                this.updateStatus('翻译失败', 'error');
            }
        } finally {
            this.setTranslatingState(false);
        }
    }

    /**
     * 准备流式显示界面
     */
    prepareStreamingDisplay() {
        // 隐藏占位符，显示结果区域
        this.outputPlaceholder.style.display = 'none';
        this.outputContent.style.display = 'block';

        // 清空之前的内容
        this.translationResult.innerHTML = '';

        // 添加流式显示的容器结构（移除光标）
        this.translationResult.innerHTML = `
            <div class="reasoning-section" style="display: none;">
                <h4>思考过程</h4>
                <div class="reasoning-content"></div>
            </div>
            <div class="translation-section">
                <div class="translation-content"></div>
            </div>
        `;
    }

    /**
     * 处理流式翻译进度
     */
    handleTranslationProgress(progressData) {
        // 如果翻译被中断，停止处理进度更新
        if (this.isAborted) {
            return;
        }

        const reasoningSection = this.translationResult.querySelector('.reasoning-section');
        const reasoningContent = this.translationResult.querySelector('.reasoning-content');
        const translationContent = this.translationResult.querySelector('.translation-content');
        const streamingCursor = this.translationResult.querySelector('.streaming-cursor');

        if (progressData.type === 'reasoning' && progressData.reasoningContent) {
            // 显示思考过程（如果使用reasoner模式）
            reasoningSection.style.display = 'block';
            reasoningContent.textContent = progressData.reasoningContent;
        }

        if (progressData.type === 'content' && progressData.finalContent) {
            // 实时更新翻译内容
            const formattedContent = this.formatTranslationResult(progressData.finalContent);
            translationContent.innerHTML = formattedContent;
            
            // 只有在用户没有手动滚动时才自动滚动到底部
            if (this.shouldAutoScroll) {
                this.outputContent.scrollTop = this.outputContent.scrollHeight;
            }
        }

        if (progressData.type === 'complete') {
            // 如果翻译被中断，不处理完成事件
            if (this.isAborted) {
                return;
            }
            // 流式翻译完成
            // 更新翻译信息
            const info = [];
        }
    }

    /**
     * 完成翻译结果处理（用于非流式或最终结果）
     */
    finalizeTranslationResult(result) {
        // 显示搜索结果（如果有）

        // 更新最终翻译信息

        // 添加淡入动画
        this.outputContent.classList.add('fade-in');
    }

    async handleScreenshot() {
        try {
            this.updateStatus('正在截图...', 'loading');

            // 触发截图
            const result = await ipcRenderer.invoke('take-screenshot');

            if (!result.success) {
                this.updateStatus('截图失败', 'error');
                console.error('Screenshot failed:', result.error);
            }
            // 截图成功后会自动触发OCR，UI已经响应，不需要在这里等待

        } catch (error) {
            console.error('Screenshot failed:', error);
            this.updateStatus('截图失败', 'error');
        }
    }

    displayTranslationResult(result) {
        // 隐藏占位符，显示结果
        this.outputPlaceholder.style.display = 'none';
        this.outputContent.style.display = 'block';

        // 格式化翻译结果，确保清理开头的特殊字符
        const cleanedText = result.translatedText ? result.translatedText.replace(/^[\s]*:[\s]*\n*/g, '').trim() : '';
        const formattedText = this.formatTranslationResult(cleanedText);
        this.translationResult.innerHTML = formattedText;



        // 添加淡入动画
        this.outputContent.classList.add('fade-in');
    }

    formatTranslationResult(text) {
        // 解析Markdown格式的翻译结果 - 更简洁紧凑的排版
        if (!text) return '';
        
        // 清理多余的空白和换行，修复开头的":\n"问题
        let cleanText = text.trim();
        
        // 移除开头可能出现的冒号和换行符
        cleanText = cleanText.replace(/^[\s]*:[\s]*\n*/g, '');
        
        // 移除开头的其他特殊字符
        cleanText = cleanText.replace(/^[\s]*[:\n\r]+/g, '');
        
        // 再次trim确保干净
        cleanText = cleanText.trim();
        
        if (!cleanText) return '';
        
        // 处理markdown标题 **标题**：（中文冒号）和 **Title**: （英文冒号）
        cleanText = cleanText.replace(/\*\*(.*?)\*\*[：:]/g, '<div class="section-title">$1</div>');

        // 处理markdown加粗 *text* → <strong>text</strong>
        cleanText = cleanText.replace(/\*([^*]+?)\*/g, '<strong>$1</strong>');

        // 处理列表项 - 开头的 - 符号
        cleanText = cleanText.replace(/^[\s]*[-•]\s*/gm, '<span class="bullet">•</span> ');
        
        // 处理数字列表 1. 2. 等
        cleanText = cleanText.replace(/^[\s]*(\d+\.)\s*/gm, '<span class="number">$1</span> ');
        
        // 合并多个连续空行为单个换行
        cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        // 将双换行转为段落分隔
        const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
        
        return paragraphs.map(paragraph => {
            // 每个段落内的单换行转为 <br>
            const formattedParagraph = paragraph
                .replace(/\n/g, '<br>')
                .trim();
                
            return `<div class="paragraph">${formattedParagraph}</div>`;
        }).join('');
    }


    setTranslatingState(isTranslating) {
        this.isTranslating = isTranslating;

        // 获取图标元素（一次性获取，避免重复查询）
        const btnPlay = this.translateBtn.querySelector('.btn-play');
        const btnStop = this.translateBtn.querySelector('.btn-stop');

        // 确保按钮始终可用（移除disabled设置，由CSS控制）
        this.translateBtn.removeAttribute('disabled');

        const currentLanguage = this.currentConfig.outputLanguage || 'english';
        const texts = this.languageMap[currentLanguage];

        if (isTranslating) {
            // 翻译中：显示停止图标
            btnPlay.style.display = 'none';
            btnStop.style.display = 'flex'; // 使用flex确保居中
            this.translateBtn.title = texts.stopTitle;
        } else {
            // 停止状态：显示播放图标
            btnPlay.style.display = 'flex'; // 使用flex确保居中
            btnStop.style.display = 'none';
            this.translateBtn.title = texts.translateTitle;
        }
    }





    toggleSettings() {
        const isVisible = this.settingsPanel.style.display !== 'none';
        
        if (isVisible) {
            this.settingsPanel.classList.add('slide-out-right');
            setTimeout(() => {
                this.settingsPanel.style.display = 'none';
                this.settingsPanel.classList.remove('slide-out-right');
            }, 300);
        } else {
            this.settingsPanel.style.display = 'flex';
            this.settingsPanel.classList.add('slide-in-right');
            setTimeout(() => {
                this.settingsPanel.classList.remove('slide-in-right');
            }, 300);
            
        }
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('dark-theme');
        this.applyTheme(!isDark);
        this.updateConfig('darkMode', !isDark);
    }

    applyTheme(isDark) {
        if (isDark) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    }

    async testApiConnection() {
        const currentLanguage = this.currentConfig.outputLanguage || 'english';
        const texts = this.languageMap[currentLanguage];
        const originalText = this.testApiBtn.textContent;

        this.testApiBtn.textContent = texts.connecting;
        this.testApiBtn.disabled = true;

        try {
            const result = await ipcRenderer.invoke('test-api-connection');

            if (result.success) {
                this.testApiBtn.textContent = texts.connected;
                this.testApiBtn.style.backgroundColor = 'var(--success-color)';
            } else {
                this.testApiBtn.textContent = texts.connectionFailed;
                this.testApiBtn.style.backgroundColor = 'var(--danger-color)';
            }

            setTimeout(() => {
                this.testApiBtn.textContent = originalText;
                this.testApiBtn.style.backgroundColor = '';
                this.testApiBtn.disabled = false;
            }, 2000);

        } catch (error) {
            this.testApiBtn.textContent = texts.connectionFailed;
            this.testApiBtn.style.backgroundColor = 'var(--danger-color)';
            setTimeout(() => {
                this.testApiBtn.textContent = originalText;
                this.testApiBtn.style.backgroundColor = '';
                this.testApiBtn.disabled = false;
            }, 2000);
        }
    }

    async updateApiKey() {
        await this.updateConfig('apiKey', this.apiKeyInput.value);
    }

    async updateModel() {
        await this.updateConfig('translateModel', this.modelSelect.value);
    }

    async updateLanguage() {
        const language = this.languageSelect.value;
        await this.updateConfig('outputLanguage', language);
        this.updateInterfaceLanguage(language);
    }

    updateInterfaceLanguage(language) {
        const texts = this.languageMap[language];
        if (!texts) return;

        // 更新主界面文本
        document.querySelector('.app-title').textContent = texts.appTitle;
        document.querySelector('.input-section .section-header h3').textContent = texts.inputHeader;
        document.querySelector('.output-section .section-header h3').textContent = texts.outputHeader;
        this.inputText.placeholder = texts.inputPlaceholder;
        document.querySelector('#outputPlaceholder p').textContent = texts.outputPlaceholder;

        // 更新工具栏按钮标题
        this.settingsBtn.title = texts.settingsTitle;
        this.themeToggle.title = texts.themeTitle;
        this.screenshotBtn.title = texts.screenshotTitle;
        this.translateBtn.title = this.isTranslating ? texts.stopTitle : texts.translateTitle;

        // 更新设置面板文本
        document.querySelector('.settings-header h2').textContent = texts.settingsHeader;

        // API 配置组
        const apiGroup = document.querySelectorAll('.setting-group')[0];
        apiGroup.querySelector('h3').textContent = texts.apiConfigHeader;
        apiGroup.querySelector('label[for="apiKeyInput"]').textContent = texts.apiKeyLabel;
        this.apiKeyInput.placeholder = texts.apiKeyPlaceholder;
        this.testApiBtn.textContent = texts.testBtnText;
        if (language === 'chinese') {
            apiGroup.querySelector('.setting-help').innerHTML = `请前往 <a href="https://platform.deepseek.com/" id="deepseekLink">DeepSeek Platform</a> 获取API密钥`;
        } else {
            apiGroup.querySelector('.setting-help').innerHTML = `Please visit <a href="https://platform.deepseek.com/" id="deepseekLink">DeepSeek Platform</a> to obtain API key`;
        }

        // 翻译选项组
        const translationGroup = document.querySelectorAll('.setting-group')[1];
        translationGroup.querySelector('h3').textContent = texts.translationOptionsHeader;
        translationGroup.querySelector('label[for="modelSelect"]').textContent = texts.modelLabel;
        translationGroup.querySelector('label[for="languageSelect"]').textContent = texts.languageLabel;

        // 更新模型选项
        const modelOptions = this.modelSelect.querySelectorAll('option');
        modelOptions[0].textContent = texts.modelStandard;
        modelOptions[1].textContent = texts.modelReasoner;

        // OCR 设置组
        const ocrGroup = document.querySelectorAll('.setting-group')[2];
        ocrGroup.querySelector('h3').textContent = texts.ocrSettingsHeader;
        ocrGroup.querySelector('label[for="textLayoutSelect"]').textContent = texts.textLayoutLabel;
        ocrGroup.querySelector('.setting-help').textContent = texts.textLayoutHelp;

        // 更新文本布局选项
        const layoutOptions = this.textLayoutSelect.querySelectorAll('option');
        layoutOptions[0].textContent = texts.textLayoutHorizontal;
        layoutOptions[1].textContent = texts.textLayoutVertical;

        // 功能选项组
        const functionsGroup = document.querySelectorAll('.setting-group')[3];
        functionsGroup.querySelector('h3').textContent = texts.functionsHeader;

        // 记忆功能
        const memorySwitch = functionsGroup.querySelectorAll('.setting-item')[0];
        memorySwitch.querySelector('.switch-label').lastChild.textContent = ' ' + texts.memoryLabel;
        memorySwitch.querySelector('.setting-help').textContent = texts.memoryHelp;

        // 自动翻译
        const autoTranslateSwitch = functionsGroup.querySelectorAll('.setting-item')[1];
        autoTranslateSwitch.querySelector('.switch-label').lastChild.textContent = ' ' + texts.autoTranslateLabel;
        autoTranslateSwitch.querySelector('.setting-help').textContent = texts.autoTranslateHelp;

        // 清空历史记录按钮
        this.clearHistoryBtn.textContent = texts.clearHistoryBtn;

        // 更新窗口控制按钮标题
        this.minimizeBtn.title = texts.minimizeTitle;
        this.closeBtn.title = texts.closeTitle;
        // 最大化按钮的标题会根据窗口状态动态更新

        // 重新绑定 DeepSeek 链接事件
        const newDeepseekLink = document.getElementById('deepseekLink');
        if (newDeepseekLink) {
            newDeepseekLink.addEventListener('click', (e) => this.handleDeepSeekLink(e));
        }
    }

    async updateTextLayout() {
        await this.updateConfig('textLayout', this.textLayoutSelect.value);
    }


    async updateHistoryToggle() {
        await this.updateConfig('enableHistory', this.enableHistoryToggle.checked);
    }

    async updateAutoTranslateToggle() {
        await this.updateConfig('autoTranslate', this.autoTranslateToggle.checked);
    }

    async clearHistory() {
        try {
            await ipcRenderer.invoke('clear-history');
        } catch (error) {
            console.error('Clear history error:', error);
        }
    }

    handleScroll() {
        // 检测用户是否滚动到接近底部（允许一些误差）
        const isNearBottom = this.outputContent.scrollTop >=
            this.outputContent.scrollHeight - this.outputContent.clientHeight - 50;

        // 如果用户滚动到接近底部，继续自动滚动；否则停止自动滚动
        this.shouldAutoScroll = isNearBottom;
    }


    async updateConfig(key, value) {
        try {
            await ipcRenderer.invoke('update-config', key, value);
            this.currentConfig[key] = value;
        } catch (error) {
            console.error('Failed to update config:', error);
        }
    }


    updateStatus(text, type = 'ready') {
        const statusDot = this.statusIndicator.querySelector('.status-dot');

        // 只更新颜色点，不显示文本，不重置className
        switch (type) {
            case 'loading':
                statusDot.style.backgroundColor = 'var(--warning-color)'; // 黄色：处理中
                break;
            case 'warning':
                statusDot.style.backgroundColor = 'var(--warning-color)'; // 黄色：警告
                break;
            case 'error':
                statusDot.style.backgroundColor = 'var(--danger-color)'; // 红色：错误
                break;
            case 'ready':
            default:
                statusDot.style.backgroundColor = 'var(--success-color)'; // 绿色：就绪/完成
                break;
        }
    }

    showError(message) {
        // 只在控制台输出错误，不显示弹窗
        console.error(message);
    }

    handleOCRResult(data) {
        console.log('[OCR] Received result:', data);

        if (data.text && data.text.trim()) {
            // 将OCR结果填充到原文文本框
            this.inputText.value = data.text;

            // 触发输入变化处理
            this.handleInputChange();

            // 显示OCR成功信息
            if (data.textCount > 0) {
                this.updateStatus(`OCR识别完成：${data.textCount}行文本 (置信度: ${(data.avgConfidence * 100).toFixed(1)}%)`, 'ready');
            } else {
                this.updateStatus('OCR识别完成', 'ready');
            }

            // 如果启用了自动翻译，开始翻译
            if (this.currentConfig.autoTranslate && data.textCount > 0) {
                setTimeout(() => {
                    this.handleTranslate();
                }, 500); // 短暂延迟确保UI更新完成
            }
        } else {
            this.updateStatus('OCR未检测到文字', 'warning');
        }
    }

    /**
     * IPC重试机制
     */
    async retryIPC(method, args = null, maxRetries = 5, delay = 500) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                if (args !== null) {
                    return await ipcRenderer.invoke(method, args);
                } else {
                    return await ipcRenderer.invoke(method);
                }
            } catch (error) {
                console.log(`[RETRY] IPC attempt ${i + 1}/${maxRetries} for ${method} failed:`, error.message);
                if (error.message.includes('No handler registered') && i < maxRetries - 1) {
                    console.log(`[RETRY] IPC method ${method} not ready, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }
        throw new Error(`IPC method ${method} failed after ${maxRetries} retries`);
    }

    setupOCRListener() {
        if (window.electronAPI && window.electronAPI.onOCRResult) {
            window.electronAPI.onOCRResult((data) => {
                this.handleOCRResult(data);
            });
        }
    }


    handleDeepSeekLink(event) {
        event.preventDefault(); // 阻止默认的链接行为

        const { shell } = require('electron');
        const url = 'https://platform.deepseek.com/';

        shell.openExternal(url).catch(error => {
            console.error('Failed to open external link:', error);
        });
    }

    // 窗口控制方法
    async handleWindowMinimize() {
        try {
            await ipcRenderer.invoke('window-minimize');
        } catch (error) {
            console.error('Failed to minimize window:', error);
        }
    }

    async handleWindowMaximize() {
        try {
            const isMaximized = await ipcRenderer.invoke('window-maximize');
            this.updateMaximizeButton(isMaximized);
        } catch (error) {
            console.error('Failed to maximize window:', error);
        }
    }

    async handleWindowClose() {
        try {
            await ipcRenderer.invoke('window-close');
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    }

    updateMaximizeButton(isMaximized) {
        const maximizeBtn = this.maximizeBtn;
        const svg = maximizeBtn.querySelector('svg');
        const currentLanguage = this.currentConfig.outputLanguage || 'english';
        const texts = this.languageMap[currentLanguage];

        if (isMaximized) {
            // 还原图标
            svg.innerHTML = '<path d="M1 3v8h8V3H1zm7 7H2V4h6v6zm2-7v1h1v6h-1v1h2V3h-2z" fill="currentColor"/>';
            maximizeBtn.title = texts.restoreTitle;
        } else {
            // 最大化图标
            svg.innerHTML = '<path d="M1 1v10h10V1H1zm9 9H2V2h8v8z" fill="currentColor"/>';
            maximizeBtn.title = texts.maximizeTitle;
        }
    }

    cleanup() {
        // 清理定时器
        if (this.autoTranslateTimeout) {
            clearTimeout(this.autoTranslateTimeout);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.translationApp = new TranslationApp();
});