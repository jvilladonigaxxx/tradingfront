import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./App.css";
import { useAuth } from "./AuthContext";
import { authenticatedFetch } from "./apiHelper";

interface Operation {
    date: string;
    symbol: string;
    buyPrice: number;
    sellPrice: number;
    shares: number;
    profit: number;
    returnPercent: number;
    sellType: string;
}

interface Company {
    name: string;
    ticker: string;
    reportTime: string;
    eventName?: string;
    currentPrice?: number;
    percentageChange90d?: number;
    marketCap?: string;
}

interface OpenPosition {
    symbol: string;
    buyDate: string;
    orderType: string;
    orderPrice: number;
    currentPrice: number;
    sharesToBuy: number;
    stopLossPrice: number;
    takeProfitPrice: number;
    orderFilled: boolean;
}

export default function App() {
    const { logout, getAuthToken } = useAuth();

    const [nextInvestment, setNextInvestment] = useState(6000);
    const [opsPerDay, setOpsPerDay] = useState(5);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [stopLoss, setStopLoss] = useState<number>(2.0);
    const [takeProfit, setTakeProfit] = useState<number>(5.0);
    const [stopLossInput, setStopLossInput] = useState<string>("2.0");
    const [takeProfitInput, setTakeProfitInput] = useState<string>("5.0");
    const [errorMessage, setErrorMessage] = useState("");

    // Modal states
    const [showEarningsModal, setShowEarningsModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [responseMessage, setResponseMessage] = useState({ type: '', message: '' });

    // Historical operations filter
    const [historicalPeriod, setHistoricalPeriod] = useState(5);

    const [operations] = useState<Operation[]>([]);

    const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
    const [isLoadingPositions, setIsLoadingPositions] = useState(false);

    const [earnings, setEarnings] = useState<Company[]>([]);
    const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
    const [allEarningsForMonth, setAllEarningsForMonth] = useState<Company[]>([]);
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

    const [earningsPage, setEarningsPage] = useState(1);
    const [selectedPage, setSelectedPage] = useState(1);
    const itemsPerPage = 5;

    // Fetch open positions on component mount
    useEffect(() => {
        // Helper function to safely convert to number
        const toNumber = (value: any): number => {
            if (value === null || value === undefined || value === '') {
                return 0;
            }
            const num = Number(value);
            return isNaN(num) ? 0 : num;
        };

        const fetchOpenPositions = async () => {
            setIsLoadingPositions(true);

            try {
                console.log('Fetching positions from API...');
                const response = await authenticatedFetch(
                    'https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/positions',
                    {
                        method: 'GET',
                    },
                    getAuthToken
                );

                console.log('Positions response status:', response.status);
                console.log('Positions response ok:', response.ok);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Positions data received:', data);

                // Safely handle the data even if structure is unexpected
                if (!data || typeof data !== 'object') {
                    console.warn('Invalid positions data format');
                    setOpenPositions([]);
                    setIsLoadingPositions(false);
                    return;
                }

                // Handle case where positions might not exist
                const positions = data.positions || {};

                // Convert positions object to array
                const positionsArray: OpenPosition[] = Object.entries(positions)
                    .map(([ticker, info]: [string, any]) => {
                        const position = info as any;

                        const result = {
                            symbol: position.ticker || ticker,
                            buyDate: position.date || data.date || 'N/A',
                            orderType: position.order_type || 'N/A',
                            orderPrice: toNumber(position.order_price),
                            currentPrice: toNumber(position.market_price),
                            sharesToBuy: toNumber(position.position),
                            stopLossPrice: toNumber(position.stop_loss_price),
                            takeProfitPrice: toNumber(position.take_profit_price),
                            orderFilled: Boolean(position.filled)
                        };

                        // Log conversion for debugging
                        console.log('Converted position:', ticker, {
                            orderPrice: position.order_price,
                            converted: result.orderPrice,
                            type: typeof result.orderPrice
                        });

                        return result;
                    });

                console.log('Final positions array:', positionsArray);
                setOpenPositions(positionsArray);
                setIsLoadingPositions(false);
            } catch (error) {
                console.error('Error fetching positions:', error);
                console.error('Error name:', (error as Error).name);
                console.error('Error message:', (error as Error).message);

                // Check if it's a network/CORS error
                if ((error as Error).name === 'TypeError' || (error as Error).message.includes('Failed to fetch')) {
                    console.error('⚠️ CORS or Network Error - API may not be accessible from this origin');
                    console.error('Current origin:', window.location.origin);
                }

                setIsLoadingPositions(false);
                setOpenPositions([]);
            }
        };

        fetchOpenPositions();
    }, [getAuthToken]);

    // Fetch current settings from API on component mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                console.log('Fetching settings from API...');
                const response = await authenticatedFetch(
                    'https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/settings',
                    {
                        method: 'GET',
                    },
                    getAuthToken
                );

                console.log('Settings response status:', response.status);
                console.log('Settings response ok:', response.ok);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Settings data received:', data);

                // Update settings state with fetched values
                if (data.stopLoss !== undefined) {
                    setStopLoss(data.stopLoss);
                    setStopLossInput(data.stopLoss.toFixed(1));
                }
                if (data.takeProfit !== undefined) {
                    setTakeProfit(data.takeProfit);
                    setTakeProfitInput(data.takeProfit.toFixed(1));
                }
                if (data.nextInvestment !== undefined) {
                    setNextInvestment(data.nextInvestment);
                }
                if (data.opsPerDay !== undefined) {
                    setOpsPerDay(data.opsPerDay);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
                console.error('Error name:', (error as Error).name);
                console.error('Error message:', (error as Error).message);

                // Check if it's a network/CORS error
                if ((error as Error).name === 'TypeError' || (error as Error).message.includes('Failed to fetch')) {
                    console.error('⚠️ CORS or Network Error - keeping default settings');
                    console.error('Current origin:', window.location.origin);
                }
                // Keep default values if fetch fails
            }
        };

        fetchSettings();
    }, [getAuthToken]);

    useEffect(() => {
        if (selectedDate) {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth() + 1; // JavaScript months are 0-indexed
            const day = selectedDate.getDate();

            setIsLoadingEarnings(true);

            authenticatedFetch(
                `https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/calendar/${year}/${month}/${day}`,
                { method: 'GET' },
                getAuthToken
            )
                .then((response: Response) => response.json())
                .then((data: any) => {
                    // Convert object to array - new API format has symbol as key
                    const companiesForDate = Object.entries(data)
                        .map(([ticker, info]: [string, any]) => ({
                            ticker: info.symbol || ticker,
                            name: info.company || ticker,
                            reportTime: info.earnings_call_time || "N/A",
                            eventName: info.event_name,
                            currentPrice: info.current_price,
                            percentageChange90d: info.percentage_change_90d,
                            marketCap: info.market_cap
                        }));

                    setAllEarningsForMonth(companiesForDate);

                    // Keep companies in the Earnings box by default
                    setEarnings(companiesForDate);
                    // Don't modify selected companies when date changes

                    setErrorMessage("");

                    setIsLoadingEarnings(false);
                })
                .catch((error: Error) => {
                    console.error('Error fetching earnings data:', error);
                    setIsLoadingEarnings(false);
                    setErrorMessage('Failed to load earnings data. Please try again.');
                });
        } else {
            setEarnings([]);
            setAllEarningsForMonth([]);
            setErrorMessage("");
        }

        setEarningsPage(1);
        setSelectedPage(1);
    }, [selectedDate, opsPerDay, getAuthToken]);

    const moveToSelected = (company: Company) => {
        if (selectedCompanies.length >= opsPerDay) {
            setErrorMessage(`You reached the maximum number of selected companies (${opsPerDay}).`);
            return;
        }
        setSelectedCompanies(prev => [...prev, company]);
        setEarnings(prev => prev.filter(c => c.ticker !== company.ticker));
        setErrorMessage("");
    };

    const moveBackToEarnings = (company: Company) => {
        setSelectedCompanies(prev => prev.filter(c => c.ticker !== company.ticker));

        // Only add back to earnings if it's from the current selected date
        if (allEarningsForMonth.some(c => c.ticker === company.ticker)) {
            setEarnings(prev => {
                // Only add back if it's not already in the earnings list
                if (!prev.some(c => c.ticker === company.ticker)) {
                    return [...prev, company];
                }
                return prev;
            });
        }

        setErrorMessage("");
    };

    // Sort earnings by percentage change (highest first)
    const sortedEarnings = [...earnings].sort((a, b) => {
        const aPercent = a.percentageChange90d ?? -Infinity;
        const bPercent = b.percentageChange90d ?? -Infinity;
        return bPercent - aPercent; // Descending order (highest first)
    });

    const paginatedEarnings = sortedEarnings.slice(
        (earningsPage - 1) * itemsPerPage,
        earningsPage * itemsPerPage
    );

    const paginatedSelected = selectedCompanies.slice(
        (selectedPage - 1) * itemsPerPage,
        selectedPage * itemsPerPage
    );




    const filteredOperations = operations.filter((op) => {
        const opDate = new Date(op.date);
        return !(selectedDate && opDate.toDateString() !== selectedDate.toDateString());
    });

    const totalProfit = filteredOperations.reduce((sum, op) => sum + op.profit, 0);
    const uniqueDays = Array.from(new Set(filteredOperations.map((op) => op.date))).length;
    const profitPerDay = uniqueDays > 0 ? totalProfit / uniqueDays : 0;

    const getHistoricalOperations = (days: number) => {
        if (operations.length === 0) return [];

        // Use today's date as the reference point
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        // Calculate the threshold date (days before today)
        const thresholdDate = new Date(today);
        thresholdDate.setDate(today.getDate() - days);
        thresholdDate.setHours(0, 0, 0, 0); // Start of that day

        return operations.filter(op => {
            const opDate = new Date(op.date);
            return opDate >= thresholdDate && opDate <= today;
        });
    };

    const downloadSelectedCompanies = () => {
        if (selectedCompanies.length === 0) {
            alert('No companies selected to download.');
            return;
        }

        const content = selectedCompanies.map(company => company.ticker).join('\n');

        // Create a blob and download - always use today's date
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `selected-companies-${dateString}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleEarningsSubmit = () => {
        setShowEarningsModal(false);

        const companyTickers = selectedCompanies.map(company => company.ticker);

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const earningsData = {
            companies: companyTickers,
            year: year,
            month: month,
            day: day
        };

        console.log("Submitting earnings companies for today:", earningsData);

        // Make POST request to companies API
        authenticatedFetch(
            'https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/companies',
            {
                method: 'POST',
                body: JSON.stringify(earningsData)
            },
            getAuthToken
        )
        .then((response: Response) => {
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            console.log('Response headers:', response.headers);

            // Check if response has content
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then((data: any) => {
                    console.log('Response data:', data);
                    return { ok: response.ok, status: response.status, data };
                });
            } else {
                // If no JSON content, return empty object
                return response.text().then((text: string) => {
                    console.log('Response text:', text);
                    return { ok: response.ok, status: response.status, data: { message: text || 'Success' } };
                });
            }
        })
        .then(({ ok, status, data }: { ok: boolean; status: number; data: any }) => {
            if (!ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${status}`);
            }

            console.log('Companies submitted successfully:', data);

            const today = new Date();
            const s3Key = `/${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

            setResponseMessage({
                type: 'success',
                message: `Companies list uploaded successfully!\n\nS3 Key: ${s3Key}`
            });
            setShowResponseModal(true);
        })
        .catch((error: Error) => {
            console.error('Error submitting companies:', error);

            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('NetworkError') || error.name === 'TypeError') {
                setResponseMessage({
                    type: 'error',
                    message: 'CORS Error: The server needs to allow requests from this origin. Please check the API Gateway CORS configuration.'
                });
            } else {
                setResponseMessage({
                    type: 'error',
                    message: error.message || 'Failed to submit companies. Please check console for details.'
                });
            }
            setShowResponseModal(true);
        });
    };

    const handleSettingsSubmit = () => {
        setShowSettingsModal(false);

        const settingsData = {
            stopLoss,
            takeProfit,
            nextInvestment,
            opsPerDay
        };

        console.log("Submitting settings:", settingsData);

        // Make POST request to settings API
        authenticatedFetch(
            'https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/settings',
            {
                method: 'POST',
                body: JSON.stringify(settingsData)
            },
            getAuthToken
        )
        .then((response: Response) => {
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            console.log('Response headers:', response.headers);

            // Check if response has content
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then((data: any) => {
                    console.log('Response data:', data);
                    return { ok: response.ok, status: response.status, data };
                });
            } else {
                // If no JSON content, return empty object
                return response.text().then((text: string) => {
                    console.log('Response text:', text);
                    return { ok: response.ok, status: response.status, data: { message: text || 'Success' } };
                });
            }
        })
        .then(({ ok, status, data }: { ok: boolean; status: number; data: any }) => {
            if (!ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${status}`);
            }

            console.log('Settings saved successfully:', data);
            setResponseMessage({
                type: 'success',
                message: data.message || 'Settings saved successfully!'
            });
            setShowResponseModal(true);
        })
        .catch((error: Error) => {
            console.error('Error saving settings:', error);

            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('NetworkError') || error.name === 'TypeError') {
                setResponseMessage({
                    type: 'error',
                    message: 'CORS Error: The server needs to allow requests from this origin. Please check the API Gateway CORS configuration.'
                });
            } else {
                setResponseMessage({
                    type: 'error',
                    message: error.message || 'Failed to save settings. Please check console for details.'
                });
            }
            setShowResponseModal(true);
        });
    };

    return (
        <div className="container">
            <header className="header">
                <div className="header-top">
                    <div className="header-title">
                        <h1>Trading Dashboard</h1>
                    </div>
                    <button
                        onClick={logout}
                        className="logout-button"
                    >
                        Logout
                    </button>
                </div>
                <div className="top-date-filter">
                    <label>Select Date:</label>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date: Date | null) => setSelectedDate(date)}
                        placeholderText="Select a date"
                        dateFormat="yyyy-MM-dd"
                    />
                </div>
            </header>

            <div className="main-content">
                {/* Left Column */}
                <div className="left-content">
                    {/* Stats - only show when there are actual operations with non-zero values */}
                    {filteredOperations.length > 0 && (totalProfit !== 0 || profitPerDay !== 0) && (
                        <section className="stats">
                            {totalProfit !== 0 && (
                                <div className="stat-card">
                                    <span>Total Profit</span>
                                    <strong className={totalProfit >= 0 ? "positive" : "negative"}>
                                        {totalProfit} $
                                    </strong>
                                </div>
                            )}
                            {profitPerDay !== 0 && (
                                <div className="stat-card">
                                    <span>Profit / Day</span>
                                    <strong className={profitPerDay >= 0 ? "positive" : "negative"}>
                                        {profitPerDay.toFixed(2)} $
                                    </strong>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Current Open Positions */}
                    <section className="open-positions-section">
                        <h2 className="table-title">Current Open Positions</h2>
                        <div className="operations-with-stats">
                            <div className="table-wrapper">
                                <table className="beautiful-table">
                                    <thead>
                                    <tr>
                                        <th>Ticker</th>
                                        <th>Buy Date</th>
                                        <th>Order Type</th>
                                        <th>Order Price</th>
                                        <th>Current Price</th>
                                        <th>Shares to Buy</th>
                                        <th>Stop Loss</th>
                                        <th>Take Profit</th>
                                        <th>Order Filled</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {isLoadingPositions ? (
                                        <tr>
                                            <td colSpan={9} className="empty-row">
                                                Loading open positions...
                                            </td>
                                        </tr>
                                    ) : openPositions.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="empty-row">
                                                No open positions.
                                            </td>
                                        </tr>
                                    ) : (
                                        openPositions.map((pos, i) => {
                                            // Extra safety: ensure all numeric values are actually numbers
                                            const safeOrderPrice = typeof pos.orderPrice === 'number' && !isNaN(pos.orderPrice) ? pos.orderPrice : 0;
                                            const safeCurrentPrice = typeof pos.currentPrice === 'number' && !isNaN(pos.currentPrice) ? pos.currentPrice : 0;
                                            const safeStopLoss = typeof pos.stopLossPrice === 'number' && !isNaN(pos.stopLossPrice) ? pos.stopLossPrice : 0;
                                            const safeTakeProfit = typeof pos.takeProfitPrice === 'number' && !isNaN(pos.takeProfitPrice) ? pos.takeProfitPrice : 0;

                                            return (
                                                <tr key={i}>
                                                    <td>{pos.symbol}</td>
                                                    <td>{pos.buyDate}</td>
                                                    <td>{pos.orderType}</td>
                                                    <td>${safeOrderPrice.toFixed(2)}</td>
                                                    <td>${safeCurrentPrice.toFixed(2)}</td>
                                                    <td>{pos.sharesToBuy || 0}</td>
                                                    <td>${safeStopLoss.toFixed(2)}</td>
                                                    <td>${safeTakeProfit.toFixed(2)}</td>
                                                <td>
                                                    <span className={pos.orderFilled ? "positive" : "negative"}>
                                                        {pos.orderFilled ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>


                    {/* Historical Operations */}
                    <section className="historical-operations">
                        <div className="historical-header">
                            <h2>Historical Operations</h2>
                            <div className="historical-filter">
                                <label>Period:</label>
                                <select
                                    value={historicalPeriod}
                                    onChange={(e) => setHistoricalPeriod(Number(e.target.value))}
                                    className="period-select"
                                >
                                    <option value={5}>Previous 5 days</option>
                                    <option value={10}>Previous 10 days</option>
                                    <option value={15}>Previous 15 days</option>
                                    <option value={30}>Previous 30 days</option>
                                </select>
                            </div>
                        </div>
                        <div className="operations-with-stats">
                            <div className="table-wrapper">
                                <table className="beautiful-table">
                                    <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Symbol</th>
                                        <th>Buy Price</th>
                                        <th>Sell Price</th>
                                        <th>Shares</th>
                                        <th>Profit</th>
                                        <th>Return (%)</th>
                                        <th>Sell Type</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {getHistoricalOperations(historicalPeriod).length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="empty-row">No operations</td>
                                        </tr>
                                    ) : (
                                        getHistoricalOperations(historicalPeriod).map((op, i) => (
                                            <tr key={i}>
                                                <td>{op.date}</td>
                                                <td>{op.symbol}</td>
                                                <td>{op.buyPrice}</td>
                                                <td>{op.sellPrice}</td>
                                                <td>{op.shares}</td>
                                                <td className={op.profit >= 0 ? "positive" : "negative"}>{op.profit} $</td>
                                                <td className={op.returnPercent >= 0 ? "positive" : "negative"}>{op.returnPercent}%</td>
                                                <td>{op.sellType}</td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                            {getHistoricalOperations(historicalPeriod).length > 0 && (
                                <div className="operations-stats">
                                    <div className="stat-card">
                                        <span>Overall Profit</span>
                                        <strong className={getHistoricalOperations(historicalPeriod).reduce((sum, op) => sum + op.profit, 0) >= 0 ? "positive" : "negative"}>
                                            {getHistoricalOperations(historicalPeriod).reduce((sum, op) => sum + op.profit, 0).toFixed(2)} $
                                        </strong>
                                    </div>
                                    <div className="stat-card">
                                        <span>Win/Loss Rate</span>
                                        <strong>
                                            <span className="positive">{getHistoricalOperations(historicalPeriod).filter(op => op.profit >= 0).length}</span>
                                            {" / "}
                                            <span className="negative">{getHistoricalOperations(historicalPeriod).filter(op => op.profit < 0).length}</span>
                                        </strong>
                                        <div style={{ fontSize: '14px', marginTop: '8px', color: '#666' }}>
                                            {((getHistoricalOperations(historicalPeriod).filter(op => op.profit >= 0).length / getHistoricalOperations(historicalPeriod).length) * 100).toFixed(1)}% Win Rate
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <span>$ Won / $ Lost</span>
                                        <strong>
                                            <span className="positive">{getHistoricalOperations(historicalPeriod).filter(op => op.profit >= 0).reduce((sum, op) => sum + op.profit, 0).toFixed(2)} $</span>
                                            {" / "}
                                            <span className="negative">{Math.abs(getHistoricalOperations(historicalPeriod).filter(op => op.profit < 0).reduce((sum, op) => sum + op.profit, 0)).toFixed(2)} $</span>
                                        </strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column */}
                <div className="right-content">
                    {/* Earnings Section */}
                    <section className="earnings-section">
                        <h2>Earnings for {selectedDate ? selectedDate.toDateString() : ""}</h2>
                        {isLoadingEarnings ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                Loading earnings data...
                            </div>
                        ) : (
                            <>
                                <div className="earnings-box">
                                    <h3>Earnings</h3>
                                    <ul>
                                        {paginatedEarnings.map((company, index) => (
                                            <li key={index}>
                                                <span>
                                                    {company.ticker} ({company.reportTime}) - {company.currentPrice !== undefined ? `$${company.currentPrice.toFixed(2)}` : 'N/A'}
                                                    {company.percentageChange90d !== undefined && (
                                                        <span className={company.percentageChange90d >= 0 ? "positive" : "negative"}>
                                                            {' '}({company.percentageChange90d > 0 ? '+' : ''}{company.percentageChange90d.toFixed(2)}%)
                                                        </span>
                                                    )}
                                                </span>
                                                <button onClick={() => moveToSelected(company)}>Select</button>
                                            </li>
                                        ))}
                                        {earnings.length === 0 && !isLoadingEarnings && <p>No companies available.</p>}
                                    </ul>
                                    {sortedEarnings.length > itemsPerPage && (
                                        <div className="pagination">
                                            <button
                                                onClick={() => setEarningsPage(prev => Math.max(1, prev - 1))}
                                                disabled={earningsPage === 1}
                                            >
                                                ←
                                            </button>
                                            <span>Page {earningsPage} of {Math.ceil(sortedEarnings.length / itemsPerPage)}</span>
                                            <button
                                                onClick={() => setEarningsPage(prev => Math.min(Math.ceil(sortedEarnings.length / itemsPerPage), prev + 1))}
                                                disabled={earningsPage === Math.ceil(sortedEarnings.length / itemsPerPage)}
                                            >
                                                →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    {/* Selected Companies Section */}
                    <section className="earnings-section">
                        <h2>Selected Companies for Today ({new Date().toLocaleDateString()})</h2>
                        <div className="earnings-box selected-companies-box">
                            <h3>Selected Companies ({selectedCompanies.length})</h3>
                            <ul>
                                {paginatedSelected.map((company, index) => (
                                    <li key={index}>
                                        <span>
                                            {company.ticker} ({company.reportTime}) - {company.currentPrice !== undefined ? `$${company.currentPrice.toFixed(2)}` : 'N/A'}
                                            {company.percentageChange90d !== undefined && (
                                                <span className={company.percentageChange90d >= 0 ? "positive" : "negative"}>
                                                    {' '}({company.percentageChange90d > 0 ? '+' : ''}{company.percentageChange90d.toFixed(2)}%)
                                                </span>
                                            )}
                                        </span>
                                        <button onClick={() => moveBackToEarnings(company)}>Selected</button>
                                    </li>
                                ))}
                                {selectedCompanies.length === 0 && <p>No companies selected.</p>}
                            </ul>
                            {selectedCompanies.length > itemsPerPage && (
                                <div className="pagination">
                                    <button
                                        onClick={() => setSelectedPage(prev => Math.max(1, prev - 1))}
                                        disabled={selectedPage === 1}
                                    >
                                        ←
                                    </button>
                                    <span>Page {selectedPage} of {Math.ceil(selectedCompanies.length / itemsPerPage)}</span>
                                    <button
                                        onClick={() => setSelectedPage(prev => Math.min(Math.ceil(selectedCompanies.length / itemsPerPage), prev + 1))}
                                        disabled={selectedPage === Math.ceil(selectedCompanies.length / itemsPerPage)}
                                    >
                                        →
                                    </button>
                                </div>
                            )}
                        </div>
                        {errorMessage && <div className="error-message">{errorMessage}</div>}

                        {/* Submit and Download buttons for Selected Companies section */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                className="submit-button"
                                onClick={() => setShowEarningsModal(true)}
                                disabled={selectedCompanies.length > opsPerDay}
                                style={{ flex: 1 }}
                            >
                                Submit
                            </button>
                            <button
                                className="submit-button"
                                onClick={downloadSelectedCompanies}
                                disabled={selectedCompanies.length === 0}
                                style={{ flex: 1, backgroundColor: '#28a745' }}
                            >
                                Download TXT
                            </button>
                        </div>
                    </section>

                    {/* Trading Settings Section */}
                    <section className="trading-settings">
                        <h2>Trading Settings</h2>

                        {/* Current Settings Display */}
                        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: '#495057' }}>Current Settings</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <span style={{ color: '#6c757d', fontSize: '14px' }}>Stop Loss:</span>
                                    <strong style={{ display: 'block', fontSize: '18px', color: '#212529', marginTop: '4px' }}>{stopLoss}%</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#6c757d', fontSize: '14px' }}>Take Profit:</span>
                                    <strong style={{ display: 'block', fontSize: '18px', color: '#212529', marginTop: '4px' }}>{takeProfit}%</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#6c757d', fontSize: '14px' }}>Investment per Trade:</span>
                                    <strong style={{ display: 'block', fontSize: '18px', color: '#212529', marginTop: '4px' }}>${nextInvestment}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#6c757d', fontSize: '14px' }}>Trades per Day:</span>
                                    <strong style={{ display: 'block', fontSize: '18px', color: '#212529', marginTop: '4px' }}>{opsPerDay}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="trading-settings-grid">
                            <div className="trading-setting-item">
                                <label>Stop Loss (%)</label>
                                <input
                                    type="text"
                                    value={stopLossInput}
                                    onChange={e => {
                                        const value = e.target.value;
                                        // Allow typing decimal numbers
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setStopLossInput(value);
                                        }
                                    }}
                                    onBlur={e => {
                                        const val = parseFloat(e.target.value);
                                        if (isNaN(val) || val < 0) {
                                            setStopLoss(2.0);
                                            setStopLossInput("2.0");
                                        } else {
                                            setStopLoss(val);
                                            setStopLossInput(val.toFixed(1));
                                        }
                                    }}
                                />
                            </div>
                            <div className="trading-setting-item">
                                <label>Take Profit (%)</label>
                                <input
                                    type="text"
                                    value={takeProfitInput}
                                    onChange={e => {
                                        const value = e.target.value;
                                        // Allow typing decimal numbers
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setTakeProfitInput(value);
                                        }
                                    }}
                                    onBlur={e => {
                                        const val = parseFloat(e.target.value);
                                        if (isNaN(val) || val < 0) {
                                            setTakeProfit(5.0);
                                            setTakeProfitInput("5.0");
                                        } else {
                                            setTakeProfit(val);
                                            setTakeProfitInput(val.toFixed(1));
                                        }
                                    }}
                                />
                            </div>
                            <div className="trading-setting-item">
                                <label>Next Investment</label>
                                <input type="number" value={nextInvestment} onChange={e => setNextInvestment(Number(e.target.value))} />
                            </div>
                            <div className="trading-setting-item">
                                <label>Trades per Day</label>
                                <input type="number" value={opsPerDay} onChange={e => setOpsPerDay(Number(e.target.value))} />
                            </div>
                        </div>

                        {/* Trading Settings Submit */}
                        <button
                            className="submit-button"
                            onClick={() => setShowSettingsModal(true)}
                        >
                            Submit
                        </button>
                    </section>
                </div>
            </div>

            {/* Earnings Confirmation Modal */}
            {showEarningsModal && (
                <div className="modal-overlay" onClick={() => setShowEarningsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Confirm Selected Companies for Today</h2>
                        <p>Are you sure you want to submit the following companies for {new Date().toLocaleDateString()}?</p>
                        <div className="modal-list">
                            {selectedCompanies.map((company, index) => (
                                <div key={index} className="modal-list-item">
                                    <strong>{company.ticker}</strong> - {company.name} ({company.reportTime}) - {company.currentPrice !== undefined ? `$${company.currentPrice.toFixed(2)}` : 'N/A'}
                                    {company.percentageChange90d !== undefined && (
                                        <span className={company.percentageChange90d >= 0 ? "positive" : "negative"}>
                                            {' '}({company.percentageChange90d > 0 ? '+' : ''}{company.percentageChange90d.toFixed(2)}%)
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px', fontSize: '14px' }}>
                            <strong>S3 Key:</strong> /{new Date().getFullYear()}/{new Date().getMonth() + 1}/{new Date().getDate()}
                        </div>
                        <div className="modal-actions">
                            <button className="modal-button cancel" onClick={() => setShowEarningsModal(false)}>
                                Cancel
                            </button>
                            <button className="modal-button confirm" onClick={handleEarningsSubmit}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Confirmation Modal */}
            {showSettingsModal && (
                <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Confirm Trading Settings</h2>
                        <p>Are you sure you want to save the following settings?</p>
                        <div className="modal-settings">
                            <div className="modal-setting-row">
                                <span>Stop Loss:</span>
                                <strong>{stopLoss}%</strong>
                            </div>
                            <div className="modal-setting-row">
                                <span>Take Profit:</span>
                                <strong>{takeProfit}%</strong>
                            </div>
                            <div className="modal-setting-row">
                                <span>Next Investment per Trade:</span>
                                <strong>${nextInvestment}</strong>
                            </div>
                            <div className="modal-setting-row">
                                <span>Trades per Day:</span>
                                <strong>{opsPerDay}</strong>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="modal-button cancel" onClick={() => setShowSettingsModal(false)}>
                                Cancel
                            </button>
                            <button className="modal-button confirm" onClick={handleSettingsSubmit}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Response Modal (Success/Error) */}
            {showResponseModal && (
                <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{responseMessage.type === 'success' ? 'Success' : 'Error'}</h2>
                        <div className={`response-message ${responseMessage.type}`}>
                            {responseMessage.message}
                        </div>
                        <div className="modal-actions">
                            <button
                                className={`modal-button ${responseMessage.type === 'success' ? 'confirm' : 'cancel'}`}
                                onClick={() => setShowResponseModal(false)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
