// Проверяем, установлен ли кошелек (Trust Wallet, MetaMask и т.д.)
if (typeof window.ethereum !== 'undefined') {
    console.log('Кошелек найден!');
    let web3 = new Web3(window.ethereum);
    let userAddress;

    const connectButton = document.getElementById('connectButton');
    const signButton = document.getElementById('signButton');
    const statusDiv = document.getElementById('status');

    // Функция для обновления статуса на странице
    function updateStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error' : 'success';
    }

    // 1. Обработчик нажатия на кнопку "Подключить Trust Wallet"
    connectButton.addEventListener('click', async () => {
        try {
            // Запрашиваем у кошелька доступ к аккаунтам
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];
            updateStatus(`Кошелек подключен! Адрес: ${userAddress}`);

            // Показываем кнопку для подписи
            connectButton.style.display = 'none';
            signButton.style.display = 'block';

        } catch (error) {
            if (error.code === 4001) {
                // Пользователь отклонил запрос
                updateStatus('Вы отклонили запрос на подключение.', true);
            } else {
                updateStatus('Произошла ошибка при подключении: ' + error.message, true);
            }
        }
    });

    // 2. Обработчик нажатия на кнопку "Подписать сообщение"
    signButton.addEventListener('click', async () => {
        if (!userAddress) {
            updateStatus('Сначала подключите кошелек.', true);
            return;
        }

        try {
            // Создаем уникальное сообщение для подписи (можно добавить случайность или nonce)
            const message = `Подтвердите владение кошельком для безопасности. Время: ${new Date().toISOString()}`;
            // const message = "MyApp Auth: " + Math.random().toString(36).substring(2); // Альтернативный вариант

            // Запрашиваем подпись у кошелька
            const signature = await web3.eth.personal.sign(message, userAddress, ''); // Пароль не нужен в DApps

            updateStatus(`Успех! Сообщение подписано. Подпись: ${signature}`);

            // ОТПРАВЬТЕ ПОДПИСЬ НА ВАШ СЕРВЕР ДЛЯ ПРОВЕРКИ
            // Здесь пример отправки на бэкенд с помощью fetch
            /*
            const verificationResponse = await fetch('/api/verify-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, signature, address: userAddress })
            });

            const result = await verificationResponse.json();
            if (result.success) {
                updateStatus('Верияфикация на сервере прошла успешно! Пользователь подтвержден.');
            } else {
                updateStatus('Ошибка верификации на сервере.', true);
            }
            */

        } catch (error) {
            if (error.code === 4001) {
                updateStatus('Вы отклонили запрос на подпись.', true);
            } else {
                updateStatus('Ошибка при подписи: ' + error.message, true);
            }
        }
    });

} else {
    // Кошелек не найден
    document.getElementById('status').innerHTML = 
        '<p class="error">Trust Wallet (или другой Web3-кошелек) не найден.</p>' +
        '<p>Пожалуйста, откройте эту страницу в браузере Trust Wallet или установите его.</p>';
}



// server.js (пример на Node.js/Express)
const express = require('express');
const { ethers } = require('ethers');
const app = express();
app.use(express.json());

app.post('/api/verify-signature', (req, res) => {
    const { message, signature, address } = req.body;

    try {
        // Восстанавливаем адрес из подписи и исходного сообщения
        const recoveredAddress = ethers.verifyMessage(message, signature);

        // Сравниваем восстановленный адрес с присланным
        if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
            // Подпись верна, пользователь подтвердил владение кошельком
            // Здесь вы можете, например, создать JWT-токен для пользователя
            res.json({ success: true, message: 'Подпись верифицирована.' });
        } else {
            // Подпись неверна!
            res.status(401).json({ success: false, message: 'Неверная подпись.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка при верификации: ' + error.message });
    }
});

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));