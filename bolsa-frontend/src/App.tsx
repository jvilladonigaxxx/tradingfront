import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./App.css";

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

export default function App() {
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

    const [operations] = useState<Operation[]>([
        { date: "2025-11-28", symbol: "AAPL", buyPrice: 180, sellPrice: 187, shares: 10, profit: 70, returnPercent: 3.8, sellType: "TP" },
        { date: "2025-11-27", symbol: "TSLA", buyPrice: 200, sellPrice: 190, shares: 5, profit: -50, returnPercent: -5, sellType: "SL" },
        { date: "2025-11-25", symbol: "GOOG", buyPrice: 120, sellPrice: 125, shares: 8, profit: 40, returnPercent: 4.2, sellType: "TP" },
    ]);

    const [earnings, setEarnings] = useState<Company[]>([]);
    const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
    const [allEarningsForMonth, setAllEarningsForMonth] = useState<Company[]>([]);
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

    const [earningsPage, setEarningsPage] = useState(1);
    const [selectedPage, setSelectedPage] = useState(1);
    const itemsPerPage = 5;


    useEffect(() => {
        if (selectedDate) {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth() + 1; // JavaScript months are 0-indexed
            const day = selectedDate.getDate();

            setIsLoadingEarnings(true);

            fetch(`https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/calendar/${year}/${month}/${day}`)
                .then(response => response.json())
                .then(data => {
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

                    // Always reset and select all companies for the new date
                    setSelectedCompanies(companiesForDate);
                    setEarnings([]);

                    // Check if auto-selected companies exceed the limit
                    if (companiesForDate.length > opsPerDay) {
                        setErrorMessage(`You reached the maximum number of selected companies (${opsPerDay}).`);
                    } else {
                        setErrorMessage("");
                    }

                    setIsLoadingEarnings(false);
                })
                .catch(error => {
                    console.error('Error fetching earnings data:', error);
                    setIsLoadingEarnings(false);
                    setErrorMessage('Failed to load earnings data. Please try again.');
                });
        } else {
            setEarnings([]);
            setSelectedCompanies([]);
            setAllEarningsForMonth([]);
            setErrorMessage("");
        }

        setEarningsPage(1);
        setSelectedPage(1);
    }, [selectedDate, opsPerDay]);

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
        setEarnings(prev => {
            // Only add back if it's in the original earnings for the month
            if (allEarningsForMonth.some(c => c.ticker === company.ticker)) {
                return [...prev, company];
            }
            return prev;
        });
        setErrorMessage("");
    };

    const paginatedEarnings = earnings.slice(
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

    const handleEarningsSubmit = () => {
        setShowEarningsModal(false);

        const companyTickers = selectedCompanies.map(company => company.ticker);

        const year = selectedDate ? selectedDate.getFullYear() : null;
        const month = selectedDate ? selectedDate.getMonth() + 1 : null;
        const day = selectedDate ? selectedDate.getDate() : null;

        const earningsData = {
            companies: companyTickers,
            year: year,
            month: month,
            day: day
        };

        console.log("Submitting earnings companies:", earningsData);

        // Make POST request to companies API
        fetch('https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/companies', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(earningsData)
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            console.log('Response headers:', response.headers);

            // Check if response has content
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => {
                    console.log('Response data:', data);
                    return { ok: response.ok, status: response.status, data };
                });
            } else {
                // If no JSON content, return empty object
                return response.text().then(text => {
                    console.log('Response text:', text);
                    return { ok: response.ok, status: response.status, data: { message: text || 'Success' } };
                });
            }
        })
        .then(({ ok, status, data }) => {
            if (!ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${status}`);
            }

            console.log('Companies submitted successfully:', data);
            setResponseMessage({
                type: 'success',
                message: data.message || 'Companies submitted successfully!'
            });
            setShowResponseModal(true);
        })
        .catch(error => {
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
        fetch('https://grv8xax0z5.execute-api.us-west-2.amazonaws.com/settings', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(settingsData)
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            console.log('Response headers:', response.headers);

            // Check if response has content
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => {
                    console.log('Response data:', data);
                    return { ok: response.ok, status: response.status, data };
                });
            } else {
                // If no JSON content, return empty object
                return response.text().then(text => {
                    console.log('Response text:', text);
                    return { ok: response.ok, status: response.status, data: { message: text || 'Success' } };
                });
            }
        })
        .then(({ ok, status, data }) => {
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
        .catch(error => {
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
                <h1>Trading Dashboard</h1>
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
                    {/* Stats */}
                    <section className="stats">
                        <div className="stat-card">
                            <span>Total Profit</span>
                            <strong className={totalProfit >= 0 ? "positive" : "negative"}>
                                {totalProfit} $
                            </strong>
                        </div>
                        <div className="stat-card">
                            <span>Profit / Day</span>
                            <strong className={profitPerDay >= 0 ? "positive" : "negative"}>
                                {profitPerDay.toFixed(2)} $
                            </strong>
                        </div>
                    </section>

                    {/* Operations Table with Stats */}
                    <h2 className="table-title">Operations List: {selectedDate ? selectedDate.toDateString() : ""}</h2>
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
                                {filteredOperations.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="empty-row">
                                            No operations match the selected date.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOperations.map((op, i) => (
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
                        {filteredOperations.length > 0 && (
                            <div className="operations-stats">
                                <div className="stat-card">
                                    <span>Overall Profit</span>
                                    <strong className={filteredOperations.reduce((sum, op) => sum + op.profit, 0) >= 0 ? "positive" : "negative"}>
                                        {filteredOperations.reduce((sum, op) => sum + op.profit, 0).toFixed(2)} $
                                    </strong>
                                </div>
                                <div className="stat-card">
                                    <span>Win/Loss Rate</span>
                                    <strong>
                                        <span className="positive">{filteredOperations.filter(op => op.profit >= 0).length}</span>
                                        {" / "}
                                        <span className="negative">{filteredOperations.filter(op => op.profit < 0).length}</span>
                                    </strong>
                                    <div style={{ fontSize: '14px', marginTop: '8px', color: '#666' }}>
                                        {((filteredOperations.filter(op => op.profit >= 0).length / filteredOperations.length) * 100).toFixed(1)}% Win Rate
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <span>$ Won / $ Lost</span>
                                    <strong>
                                        <span className="positive">{filteredOperations.filter(op => op.profit >= 0).reduce((sum, op) => sum + op.profit, 0).toFixed(2)} $</span>
                                        {" / "}
                                        <span className="negative">{Math.abs(filteredOperations.filter(op => op.profit < 0).reduce((sum, op) => sum + op.profit, 0)).toFixed(2)} $</span>
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>

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
                                <div className="earnings-boxes">
                                    <div className="earnings-box">
                                        <h3>Earnings</h3>
                                        <ul>
                                            {paginatedEarnings.map((company, index) => (
                                                <li key={index}>
                                                    <span>{company.ticker} ({company.reportTime})</span>
                                                    <button onClick={() => moveToSelected(company)}>→</button>
                                                </li>
                                            ))}
                                            {earnings.length === 0 && !isLoadingEarnings && <p>No companies available.</p>}
                                        </ul>
                                {earnings.length > itemsPerPage && (
                                    <div className="pagination">
                                        <button
                                            onClick={() => setEarningsPage(prev => Math.max(1, prev - 1))}
                                            disabled={earningsPage === 1}
                                        >
                                            ←
                                        </button>
                                        <span>Page {earningsPage} of {Math.ceil(earnings.length / itemsPerPage)}</span>
                                        <button
                                            onClick={() => setEarningsPage(prev => Math.min(Math.ceil(earnings.length / itemsPerPage), prev + 1))}
                                            disabled={earningsPage === Math.ceil(earnings.length / itemsPerPage)}
                                        >
                                            →
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="earnings-box selected-companies-box">
                                <h3>Selected Companies</h3>
                                <ul>
                                    {paginatedSelected.map((company, index) => (
                                        <li key={index}>
                                            <span>{company.ticker} ({company.reportTime})</span>
                                            <button onClick={() => moveBackToEarnings(company)}>←</button>
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
                        </div>
                                {errorMessage && <div className="error-message">{errorMessage}</div>}

                                {/* Submit button for Earnings section */}
                                <button
                                    className="submit-button"
                                    onClick={() => setShowEarningsModal(true)}
                                    disabled={selectedCompanies.length > opsPerDay}
                                >
                                    Submit
                                </button>
                            </>
                        )}
                    </section>

                    {/* Trading Settings Section */}
                    <section className="trading-settings">
                        <h2>Trading Settings</h2>
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
                                <label>Next Investment per Trade</label>
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
                        <h2>Confirm Selected Companies</h2>
                        <p>Are you sure you want to submit the following companies?</p>
                        <div className="modal-list">
                            {selectedCompanies.map((company, index) => (
                                <div key={index} className="modal-list-item">
                                    <strong>{company.ticker}</strong> - {company.name} ({company.reportTime})
                                </div>
                            ))}
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
                        <h2>{responseMessage.type === 'success' ? '✓ Success' : '✗ Error'}</h2>
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
