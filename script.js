
document.addEventListener('DOMContentLoaded', function () {
    const coins = ['ethusdt', 'bnbusdt', 'dotusdt'];
    const coinSelector = document.getElementById('coinSelector');
    const timeframeSelector = document.getElementById('timeframeSelector');

    let historicalData = [];
    let ws = null; 
    const chartContainer = document.getElementById('chart');
    const chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: {
            backgroundColor: '#F9FAFB',
            textColor: '#000',
        },
        grid: {
            vertLines: {
                color: '#f0f3fa',
            },
            horzLines: {
                color: '#f0f3fa',
            },
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: true,
        },
    });

    const lineSeries = chart.addCandlestickSeries({
        upColor: '#4FFF28',
        downColor: '#FF4976',
        borderUpColor: '#4FFF28',
        borderDownColor: '#FF4976',
        wickUpColor: '#4FFF28',
        wickDownColor: '#FF4976',
    });

    // Initialize coin selector
    coins.forEach(coin => {
        const option = document.createElement('option');
        option.value = coin;
        option.textContent = coin.toUpperCase();
        coinSelector.appendChild(option);
    });

    // Load saved preferences from localStorage
    const savedCoin = localStorage.getItem('selectedCoin') || coins[0]; // Default is first coin
    const savedInterval = localStorage.getItem('selectedInterval') || '1m'; // Default is 1 minute

    coinSelector.value = savedCoin;
    timeframeSelector.value = savedInterval;

    let selectedCoin = savedCoin;
    let selectedInterval = savedInterval;


    const connectWebSocket = (symbol, interval) => {
        
        if (ws) {
            ws.close();
        }

        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`);

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const candlestick = message.k;

            // Only process completed candles
            if (candlestick.x) {
                const ohlc = {
                    time: Math.floor(candlestick.t / 1000), // Convert to UNIX timestamp in seconds
                    open: parseFloat(candlestick.o),
                    high: parseFloat(candlestick.h),
                    low: parseFloat(candlestick.l),
                    close: parseFloat(candlestick.c),
                };
                updateCandlestick(ohlc);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    };


    const updateCandlestick = (ohlc) => {
        if (historicalData.length > 0 && historicalData[historicalData.length - 1].time === ohlc.time) {
            historicalData[historicalData.length - 1] = ohlc; // Update existing candle
        } else {
            historicalData.push(ohlc); // Add new candle
        }

        updateChart();
    };

    // Function to initialize or update the chart
    const updateChart = () => {
        lineSeries.setData(historicalData);
       
    };

    // Fetching historical data when switching interval or coin
    const fetchHistoricalData = async (symbol, interval) => {
        const endpoint = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=1000`;
        const response = await fetch(endpoint);
        const data = await response.json();

        // Mapping the historical data to required format
        historicalData = data.map(candle => ({
            time: candle[0] / 1000, 
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
        }));

        updateChart();
    };

    coinSelector.addEventListener('change', () => {
        selectedCoin = coinSelector.value;
        selectedInterval = timeframeSelector.value;

        localStorage.setItem('selectedCoin', selectedCoin);
        localStorage.setItem('selectedInterval', selectedInterval);

        historicalData = [];
        fetchHistoricalData(selectedCoin, selectedInterval); 
        connectWebSocket(selectedCoin, selectedInterval);
    });

    timeframeSelector.addEventListener('change', () => {
        selectedCoin = coinSelector.value;
        selectedInterval = timeframeSelector.value;

        localStorage.setItem('selectedCoin', selectedCoin);
        localStorage.setItem('selectedInterval', selectedInterval);

        historicalData = [];
        fetchHistoricalData(selectedCoin, selectedInterval);
        connectWebSocket(selectedCoin, selectedInterval);
    });

    // initial execution of data fetching
    fetchHistoricalData(selectedCoin, selectedInterval); 
    connectWebSocket(selectedCoin, selectedInterval); 
});