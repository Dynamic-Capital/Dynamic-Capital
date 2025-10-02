# Quantitative Finance Libraries by Language

This reference organizes open-source and community-maintained quantitative
finance tooling by programming language. Each section groups libraries by their
primary focus area so you can quickly locate options for pricing, data access,
analytics, or visualization within your preferred stack.

## Table of Contents

- [Python](#python)
- [R](#r)
- [Matlab](#matlab)
- [Julia](#julia)
- [Java](#java)
- [C# and .NET](#csharp)
- [JavaScript](#javascript)
- [Data Visualization](#data-visualization)
- [Haskell](#haskell)
- [Scala](#scala)
- [Ruby](#ruby)
- [Elixir/Erlang](#elixirerlang)
- [Golang](#golang)
- [C++](#cpp)
- [Frameworks](#frameworks)
- [Rust](#rust)
- [Reproducing Works, Training & Books](#reproducing-works-training--books)

## Python

### Numerical Libraries & Data Structures

- **numpy** – NumPy is the fundamental package for scientific computing with
  Python.
- **scipy** – SciPy (pronounced “Sigh Pie”) is a Python-based ecosystem of
  open-source software for mathematics, science, and engineering.
- **pandas** – pandas is an open source, BSD-licensed library providing
  high-performance, easy-to-use data structures and data analysis tools for the
  Python programming language.
- **polars** – Polars is a blazingly fast DataFrame library for manipulating
  structured data.
- **quantdsl** – Domain specific language for quantitative analytics in finance
  and trading.
- **statistics** – Builtin Python library for all basic statistical
  calculations.
- **sympy** – SymPy is a Python library for symbolic mathematics.
- **pymc3** – Probabilistic Programming in Python: Bayesian Modeling and
  Probabilistic Machine Learning with Theano.
- **modelx** – Python reimagination of spreadsheets as formula-centric objects
  that are interoperable with pandas.
- **jax** – Autograd and XLA-backed numerical computing library for high-
  performance differentiable programming.
- **numba** – Just-in-time compiler that accelerates numerical Python code,
  especially vectorized computations in quantitative workflows.
- **ArcticDB** – High performance datastore for time series and tick data.

### Financial Instruments and Pricing

- **OpenBB Terminal** – Terminal for investment research for everyone.
- **Fincept Terminal** – Advance Data Based A.I Terminal for all Types of
  Financial Asset Research.
- **PyQL** – QuantLib's Python port.
- **pyfin** – Basic options pricing in Python. ARCHIVED
- **vollib** – vollib is a python library for calculating option prices, implied
  volatility and greeks.
- **QuantPy** – A framework for quantitative finance In python.
- **Finance-Python** – Python tools for Finance.
- **ffn** – A financial function library for Python.
- **pynance** – Lightweight Python library for assembling and analyzing
  financial data.
- **tia** – Toolkit for integration and analysis.
- **hasura/base-python-dash** – Hasura quick start to deploy Dash framework.
  Written on top of Flask, Plotly.js, and React.js, Dash is ideal for building
  data visualization apps with highly custom user interfaces in pure Python.
- **hasura/base-python-bokeh** – Hasura quick start to visualize data with bokeh
  library.
- **pysabr** – SABR model Python implementation.
- **FinancePy** – A Python Finance Library that focuses on the pricing and
  risk-management of Financial Derivatives, including fixed-income, equity, FX
  and credit derivatives.
- **gs-quant** – Python toolkit for quantitative finance
- **willowtree** – Robust and flexible Python implementation of the willow tree
  lattice for derivatives pricing.
- **financial-engineering** – Applications of Monte Carlo methods to financial
  engineering projects, in Python.
- **optlib** – A library for financial options pricing written in Python.
- **tf-quant-finance** – High-performance TensorFlow library for quantitative
  finance.
- **Q-Fin** – A Python library for mathematical finance.
- **Quantsbin** – Tools for pricing and plotting of vanilla option prices,
  greeks and various other analysis around them.
- **mibian** – Lightweight library implementing Black-Scholes, Garman-Kohlhagen
  and other option pricing formulas for equities and FX.
- **QuantLib-Python** – Official Python bindings for QuantLib offering
  production-grade pricing, risk, and curve construction components.
- **finoptions** – Complete python implementation of R package fOptions with
  partial implementation of fExoticOptions for pricing various options.
- **pypme** – PME (Public Market Equivalent) calculation.
- **AbsBox** – A Python based library to model cashflow for structured product
  like Asset-backed securities (ABS) and Mortgage-backed securities (MBS).
- **Intrinsic-Value-Calculator** – A Python tool for quick calculations of a
  stock's fair value using Discounted Cash Flow analysis.
- **Kelly-Criterion** – Kelly Criterion implemented in Python to size portfolios
  based on J. L. Kelly Jr's formula.
- **rateslib** – A fixed income library for pricing bonds and bond futures, and
  derivatives such as IRS, cross-currency and FX swaps.
- **fypy** – Vanilla and exotic option pricing library to support quantitative
  R&D. Focus on pricing interesting/useful models and contracts (including and
  beyond Black-Scholes), as well as calibration of financial models to market
  data.

### Indicators

- **pandas_talib** – A Python Pandas implementation of technical analysis
  indicators.
- **finta** – Common financial technical analysis indicators implemented in
  Pandas.
- **Tulipy** – Financial Technical Analysis Indicator Library (Python bindings
  for tulipindicators)
- **lppls** – A Python module for fitting the Log-Periodic Power Law Singularity
  (LPPLS) model.
- **talipp** – Incremental technical analysis library for Python.
- **streaming_indicators** – A python library for computing technical analysis
  indicators on streaming data.

### Trading & Backtesting

- **skfolio** – Python library for portfolio optimization built on top of
  scikit-learn. It provides a unified interface and sklearn compatible tools to
  build, tune and cross-validate portfolio models.
- **Investing algorithm framework** – Framework for developing, backtesting, and
  deploying automated trading algorithms.
- **QSTrader** – QSTrader backtesting simulation engine.
- **Blankly** – Fully integrated backtesting, paper trading, and live
  deployment.
- **TA-Lib** – Python wrapper for TA-Lib (http://ta-lib.org/).
- **zipline** – Pythonic algorithmic trading library.
- **zipline-reloaded** – Zipline, a Pythonic Algorithmic Trading Library.
- **zipline-live** – Fork of Zipline with adapters for live brokerage and data
  feeds to bridge research and production trading.
- **QuantSoftware Toolkit** – Python-based open source software framework
  designed to support portfolio construction and management.
- **quantitative** – Quantitative finance, and backtesting library.
- **analyzer** – Python framework for real-time financial and backtesting
  trading strategies.
- **bt** – Flexible Backtesting for Python.
- **backtrader** – Python Backtesting library for trading strategies.
- **pythalesians** – Python library to backtest trading strategies, plot charts,
  seamlessly download market data, analyze market patterns etc.
- **pybacktest** – Vectorized backtesting framework in Python / pandas, designed
  to make your backtesting easier.
- **pyalgotrade** – Python Algorithmic Trading Library.
- **basana** – A Python async and event driven framework for algorithmic
  trading, with a focus on crypto currencies.
- **tradingWithPython** – A collection of functions and classes for Quantitative
  trading.
- **Pandas TA** – Pandas TA is an easy to use Python 3 Pandas Extension with
  115+ Indicators. Easily build Custom Strategies.
- **ta** – Technical Analysis Library using Pandas (Python)
- **algobroker** – This is an execution engine for algo trading.
- **pysentosa** – Python API for sentosa trading system.
- **finmarketpy** – Python library for backtesting trading strategies and
  analyzing financial markets.
- **binary-martingale** – Computer program to automatically trade binary options
  martingale style.
- **fooltrader** – the project using big-data technology to provide an uniform
  way to analyze the whole market.
- **zvt** – the project using sql, pandas to provide an uniform and extendable
  way to record data, computing factors, select securities, backtesting,
  realtime trading and it could show all of them in clearly charts in realtime.
- **pylivetrader** – zipline-compatible live trading library.
- **pipeline-live** – zipline's pipeline capability with IEX for live trading.
- **zipline-extensions** – Zipline extensions and adapters for QuantRocket.
- **lumibot** – Event-driven algorithmic trading framework with paper trading
  and live execution adapters for multiple brokers.
- **moonshot** – Vectorized backtester and trading engine for QuantRocket based
  on Pandas.
- **PyPortfolioOpt** – Financial portfolio optimization in python, including
  classical efficient frontier and advanced methods.
- **Eiten** – Eiten is an open source toolkit by Tradytics that implements
  various statistical and algorithmic investing strategies such as Eigen
  Portfolios, Minimum Variance Portfolios, Maximum Sharpe Ratio Portfolios, and
  Genetic Algorithms based Portfolios.
- **riskparity.py** – fast and scalable design of risk parity portfolios with
  TensorFlow 2.0
- **mlfinlab** – Implementations regarding "Advances in Financial Machine
  Learning" by Marcos Lopez de Prado. (Feature Engineering, Financial Data
  Structures, Meta-Labeling)
- **pyqstrat** – A fast, extensible, transparent python library for backtesting
  quantitative strategies.
- **NowTrade** – Python library for backtesting technical/mechanical strategies
  in the stock and currency markets.
- **pinkfish** – A backtester and spreadsheet library for security analysis.
- **aat** – Async Algorithmic Trading Engine
- **Backtesting.py** – Backtest trading strategies in Python
- **catalyst** – An Algorithmic Trading Library for Crypto-Assets in Python
- **quantstats** – Portfolio analytics for quants, written in Python
- **qtpylib** – QTPyLib, Pythonic Algorithmic Trading http://qtpylib.io
- **Quantdom** – Python-based framework for backtesting trading strategies &
  analyzing financial markets [GUI :neckbeard:]
- **freqtrade** – Free, open source crypto trading bot
- **algorithmic-trading-with-python** – Free pandas and scikit-learn resources
  for trading simulation, backtesting, and machine learning on financial data.
- **DeepDow** – Portfolio optimization with deep learning
- **Qlib** – An AI-oriented Quantitative Investment Platform by Microsoft. Full
  ML pipeline of data processing, model training, back-testing; and covers the
  entire chain of quantitative investment: alpha seeking, risk modeling,
  portfolio optimization, and order execution.
- **machine-learning-for-trading** – Code and resources for Machine Learning for
  Algorithmic Trading
- **AlphaPy** – Automated Machine Learning [AutoML] with Python, scikit-learn,
  Keras, XGBoost, LightGBM, and CatBoost
- **jesse** – An advanced crypto trading bot written in Python
- **rqalpha** – A extendable, replaceable Python algorithmic backtest && trading
  framework supporting multiple securities.
- **FinRL-Library** – A Deep Reinforcement Learning Library for Automated
  Trading in Quantitative Finance. NeurIPS 2020.
- **bulbea** – Deep Learning based Python Library for Stock Market Prediction
  and Modelling.
- **ib_nope** – Automated trading system for NOPE strategy over IBKR TWS.
- **OctoBot** – Open source cryptocurrency trading bot for high frequency,
  arbitrage, TA and social trading with an advanced web interface.
- **bta-lib** – Technical Analysis library in pandas for backtesting algotrading
  and quantitative analysis.
- **Stock-Prediction-Models** – Gathers machine learning and deep learning
  models for Stock forecasting including trading bots and simulations.
- **TuneTA** – TuneTA optimizes technical indicators using a distance
  correlation measure to a user defined target feature such as next day return.
- **AutoTrader** – A Python-based development platform for automated trading
  systems - from backtesting to optimization to livetrading.
- **fast-trade** – A library built with backtest portability and performance in
  mind for backtest trading strategies.
- **qf-lib** – QF-Lib is a Python library that provides high quality tools for
  quantitative finance.
- **tda-api** – Gather data and trade equities, options, and ETFs via
  TDAmeritrade.
- **vectorbt** – Find your trading edge, using a powerful toolkit for
  backtesting, algorithmic trading, and research.
- **Lean** – Lean Algorithmic Trading Engine by QuantConnect (Python, C#).
- **fast-trade** – Low code backtesting library utilizing pandas and technical
  analysis indicators.
- **pysystemtrade** – pysystemtrade is the open source version of Robert
  Carver's backtesting and trading engine that implements systems according to
  the framework outlined in his book "Systematic Trading", which is further
  developed on his blog.
- **pytrendseries** – Detect trend in time series, drawdown, drawdown within a
  constant look-back window , maximum drawdown, time underwater.
- **PyLOB** – Fully functioning fast Limit Order Book written in Python.
- **PyBroker** – Algorithmic Trading with Machine Learning.
- **OctoBot Script** – A quant framework to create cryptocurrencies strategies -
  from backtesting to optimization to livetrading.
- **hftbacktest** – A high-frequency trading and market-making backtesting tool
  accounts for limit orders, queue positions, and latencies, utilizing full tick
  data for trades and order books.
- **vnpy** – VeighNa is a Python-based open source quantitative trading system
  development framework.
- **Intelligent Trading Bot** – Automatically generating signals and trading
  based on machine learning and feature engineering
- **fastquant** – fastquant allows you to easily backtest investment strategies
  with as few as 3 lines of python code.
- **nautilus_trader** – A high-performance algorithmic trading platform and
  event-driven backtester.
- **YABTE** – Yet Another (Python) BackTesting Engine.
- **Trading Strategy** – TradingStrategy.ai is a market data, backtesting, live
  trading and investor management framework for decentralised finance
- **Hikyuu** – A base on Python/C++ open source high-performance quant framework
  for faster analysis and backtesting, contains the complete trading system
  components for reuse and combination. You can use python or c++ freely.
- **rust_bt** – A high performance, low-latency backtesting engine for testing
  quantitative trading strategies on historical and live data in Rust.

### Risk Analysis

- **QuantLibRisks** – Fast risks with QuantLib
- **XAD** – Automatic Differentation (AAD) Library
- **pyfolio** – Portfolio and risk analytics in Python.
- **empyrical** – Common financial risk and performance metrics.
- **fecon235** – Computational tools for financial economics include: Gaussian
  Mixture model of leptokurtotic risk, adaptive Boltzmann portfolios.
- **finance** – Financial Risk Calculations. Optimized for ease of use through
  class construction and operator overload.
- **qfrm** – Quantitative Financial Risk Management: awesome OOP tools for
  measuring, managing and visualizing risk of financial instruments and
  portfolios.
- **visualize-wealth** – Portfolio construction and quantitative analysis.
- **VisualPortfolio** – This tool is used to visualize the performance of a
  portfolio.
- **universal-portfolios** – Collection of algorithms for online portfolio
  selection.
- **FinQuant** – A program for financial portfolio management, analysis and
  optimization.
- **Empyrial** – Portfolio's risk and performance analytics and returns
  predictions.
- **risktools** – Risk tools for use within the crude and crude products trading
  space with partial implementation of R's PerformanceAnalytics.
- **Riskfolio-Lib** – Portfolio Optimization and Quantitative Strategic Asset
  Allocation in Python.
- **empyrical-reloaded** – Common financial risk and performance metrics.
  empyrical fork.
- **pyfolio-reloaded** – Portfolio and risk analytics in Python. pyfolio fork.
- **fortitudo.tech** – Conditional Value-at-Risk (CVaR) portfolio optimization
  and Entropy Pooling views / stress-testing in Python.

### Factor Analysis

- **alphalens** – Performance analysis of predictive alpha factors.
- **alphalens-reloaded** – Performance analysis of predictive (alpha) stock
  factors.
- **Spectre** – GPU-accelerated Factors analysis library and Backtester

### Sentiment Analysis

- **Asset News Sentiment Analyzer** – Sentiment analysis and report generation
  package for financial assets and securities utilizing GPT models.

### Quant Research Environment

- **Jupyter Quant** – A dockerized Jupyter quant research environment with
  preloaded tools for quant analysis, statsmodels, pymc, arch, py_vollib,
  zipline-reloaded, PyPortfolioOpt, etc.

### Time Series

- **ARCH** – ARCH models in Python.
- **statsmodels** – Python module that allows users to explore data, estimate
  statistical models, and perform statistical tests.
- **dynts** – Python package for timeseries analysis and manipulation.
- **PyFlux** – Python library for timeseries modelling and inference
  (frequentist and Bayesian) on models.
- **tsfresh** – Automatic extraction of relevant features from time series.
- **hasura/quandl-metabase** – Hasura quickstart to visualize Quandl's
  timeseries datasets with Metabase.
- **Facebook Prophet** – Tool for producing high quality forecasts for time
  series data that has multiple seasonality with linear or non-linear growth.
- **tsmoothie** – A python library for time-series smoothing and outlier
  detection in a vectorized way.
- **pmdarima** – A statistical library designed to fill the void in Python's
  time series analysis capabilities, including the equivalent of R's auto.arima
  function.
- **gluon-ts** – vProbabilistic time series modeling in Python.
- **functime** – Time-series machine learning at scale. Built with Polars for
  embarrassingly parallel feature extraction and forecasts on panel data.
- **darts** – Unified forecasting API covering classical statistical models,
  machine learning, and deep learning approaches.
- **NeuralProphet** – Neural network-based forecasting framework extending
  Facebook Prophet with autoregression and lagged regressors.
- **StatsForecast** – Production-ready statistical forecasting library with
  scalable implementations of classic time-series models.

### Calendars

- **exchange_calendars** – Stock Exchange Trading Calendars.
- **bizdays** – Business days calculations and utilities.
- **pandas_market_calendars** – Exchange calendars to use with pandas for
  trading applications.

### Data Sources

- **yfinance** – Yahoo! Finance market data downloader (+faster Pandas
  Datareader)
- **findatapy** – Python library to download market data via Bloomberg, Quandl,
  Yahoo etc.
- **googlefinance** – Python module to get real-time stock data from Google
  Finance API.
- **yahoo-finance** – Python module to get stock data from Yahoo! Finance.
- **pandas-datareader** – Python module to get data from various sources (Google
  Finance, Yahoo Finance, FRED, OECD, Fama/French, World Bank, Eurostat...) into
  Pandas datastructures such as DataFrame, Panel with a caching mechanism.
- **pandas-finance** – High level API for access to and analysis of financial
  data.
- **pyhoofinance** – Rapidly queries Yahoo Finance for multiple tickers and
  returns typed data for analysis.
- **yfinanceapi** – Finance API for Python.
- **yql-finance** – yql-finance is simple and fast. API returns stock closing
  prices for current period of time and current stock ticker (i.e. APPL, GOOGL).
- **ystockquote** – Retrieve stock quote data from Yahoo Finance.
- **wallstreet** – Real time stock and option data.
- **stock_extractor** – General Purpose Stock Extractors from Online Resources.
- **Stockex** – Python wrapper for Yahoo! Finance API.
- **finsymbols** – Obtains stock symbols and relating information for SP500,
  AMEX, NYSE, and NASDAQ.
- **FRB** – Python Client for FRED® API.
- **inquisitor** – Python Interface to Econdb.com API.
- **yfi** – Yahoo! YQL library.
- **chinesestockapi** – Python API to get Chinese stock price.
- **exchange** – Get current exchange rate.
- **ticks** – Simple command line tool to get stock ticker data.
- **pybbg** – Python interface to Bloomberg COM APIs.
- **ib_insync** – Async/await-friendly wrapper around Interactive Brokers'
  Trader Workstation API for data retrieval and order management.
- **ccy** – Python module for currencies.
- **tushare** – A utility for crawling historical and Real-time Quotes data of
  China stocks.
- **jsm** – Get the japanese stock market data.
- **cn_stock_src** – Utility for retrieving basic China stock data from
  different sources.
- **coinmarketcap** – Python API for coinmarketcap.
- **after-hours** – Obtain pre market and after hours stock prices for a given
  symbol.
- **bronto-python** – Bronto API Integration for Python.
- **pytdx** – Python Interface for retrieving chinese stock realtime quote data
  from TongDaXin Nodes.
- **pdblp** – A simple interface to integrate pandas and the Bloomberg Open API.
- **tiingo** – Python interface for daily composite prices/OHLC/Volume +
  Real-time News Feeds, powered by the Tiingo Data Platform.
- **iexfinance** – Python Interface for retrieving real-time and historical
  prices and equities data from The Investor's Exchange.
- **pyEX** – Python interface to IEX with emphasis on pandas, support for
  streaming data, premium data, points data (economic, rates, commodities), and
  technical indicators.
- **alpaca-trade-api** – Python interface for retrieving real-time and
  historical prices from Alpaca API as well as trade execution.
- **metatrader5** – API Connector to MetaTrader 5 Terminal
- **akshare** – AkShare is an elegant and simple financial data interface
  library for Python, built for human beings! https://akshare.readthedocs.io
- **yahooquery** – Python interface for retrieving data through unofficial Yahoo
  Finance API.
- **investpy** – Financial Data Extraction from Investing.com with Python!
  https://investpy.readthedocs.io/
- **yliveticker** – Live stream of market data from Yahoo Finance websocket.
- **bbgbridge** – Easy to use Bloomberg Desktop API wrapper for Python.
- **polygon.io** – A python library for Polygon.io financial data APIs.
- **alpha_vantage** – A python wrapper for Alpha Vantage API for financial data.
- **FinanceDataReader** – Open Source Financial data reader for U.S, Korean,
  Japanese, Chinese, Vietnamese Stocks
- **pystlouisfed** – Python client for Federal Reserve Bank of St. Louis API -
  FRED, ALFRED, GeoFRED and FRASER.
- **python-bcb** – Python interface to Brazilian Central Bank web services.
- **market-prices** – Create meaningful OHLCV datasets from knowledge of
  exchange-calendars (works out-the-box with data from Yahoo Finance).
- **tardis-python** – Python interface for Tardis.dev high frequency crypto
  market data
- **lake-api** – Python interface for Crypto Lake high frequency crypto market
  data
- **tessa** – simple, hassle-free access to price information of financial
  assets (currently based on yfinance and pycoingecko), including search and a
  symbol class.
- **pandaSDMX** – Python package that implements SDMX 2.1 (ISO 17369:2013), a
  format for exchange of statistical data and metadata used by national
  statistical agencies, central banks, and international organisations.
- **cif** – Python package that include few composite indicators, which
  summarize multidimensional relationships between individual economic
  indicators.
- **finagg** – finagg is a Python package that provides implementations of
  popular and free financial APIs, tools for aggregating historical data from
  those APIs into SQL databases, and tools for transforming aggregated data into
  features useful for analysis and AI/ML.
- **FinanceDatabase** – This is a database of 300.000+ symbols containing
  Equities, ETFs, Funds, Indices, Currencies, Cryptocurrencies and Money
  Markets.
- **Trading Strategy** – download price data for decentralised exchanges and
  lending protocols (DeFi)
- **datamule-python** – A package to work with SEC data. Incorporates datamule
  endpoints.
- **Financial Data** – Stock Market and Financial Data API.
- **sec-edgar-downloader** – Simple client for downloading filings from the SEC
  EDGAR system.
- **SaxoOpenAPI** – Saxo Bank financial data API.

### Excel Integration

- **xlwings** – Make Excel fly with Python.
- **openpyxl** – Read/Write Excel 2007 xlsx/xlsm files.
- **xlrd** – Library for developers to extract data from Microsoft Excel
  spreadsheet files.
- **xlsxwriter** – Write files in the Excel 2007+ XLSX file format.
- **xlwt** – Library to create spreadsheet files compatible with MS Excel
  97/2000/XP/2003 XLS files, on any platform.
- **DataNitro** – DataNitro also offers full-featured Python-Excel integration,
  including UDFs. Trial downloads are available, but users must purchase a
  license.
- **xlloop** – XLLoop is an open source framework for implementing Excel
  user-defined functions (UDFs) on a centralised server (a function server).
- **expy** – The ExPy add-in allows easy use of Python directly from within an
  Microsoft Excel spreadsheet, both to execute arbitrary code and to define new
  Excel functions.
- **pyxll** – PyXLL is an Excel add-in that enables you to extend Excel using
  nothing but Python code.

### Visualization

- **D-Tale** – Visualizer for pandas dataframes and xarray datasets.
- **mplfinance** – matplotlib utilities for the visualization, and visual
  analysis, of financial data.
- **finplot** – Performant and effortless finance plotting for Python.
- **finvizfinance** – Finviz analysis python library.
- **market-analy** – Analysis and interactive charting using market-prices and
  bqplot.
- **QuantInvestStrats** – Quantitative Investment Strategies (QIS) package
  implements Python analytics for visualisation of financial data, performance
  reporting, analysis of quantitative strategies.

## R

### Numerical Libraries & Data Structures

- **xts** – eXtensible Time Series: Provide for uniform handling of R's
  different time-based data classes by extending zoo, maximizing native format
  information preservation and allowing for user level customization and
  extension, while simplifying cross-class interoperability.
- **data.table** – Extension of data.frame: Fast aggregation of large data (e.g.
  100GB in RAM), fast ordered joins, fast add/modify/delete of columns by group
  using no copies at all, list columns and a fast file reader (fread). Offers a
  natural and flexible syntax, for faster development.
- **sparseEigen** – Sparse principal component analysis.
- **TSdbi** – Provides a common interface to time series databases.
- **tseries** – Time Series Analysis and Computational Finance.
- **zoo** – S3 Infrastructure for Regular and Irregular Time Series (Z's Ordered
  Observations).
- **tis** – Functions and S3 classes for time indexes and time indexed series,
  which are compatible with FAME frequencies.
- **tfplot** – Utilities for simple manipulation and quick plotting of time
  series data.
- **tframe** – A kernel of functions for programming time series methods in a
  way that is relatively independently of the representation of time.

### Data Sources

- **IBrokers** – Provides native R access to Interactive Brokers Trader
  Workstation API.
- **Rblpapi** – An R Interface to 'Bloomberg' is provided via the 'Blp API'.
- **Quandl** – Get Financial Data Directly Into R.
- **Rbitcoin** – Unified markets API interface (bitstamp, kraken, btce,
  bitmarket).
- **GetTDData** – Downloads and aggregates data for Brazilian government issued
  bonds directly from the website of Tesouro Direto.
- **GetHFData** – Downloads and aggregates high frequency trading data for
  Brazilian instruments directly from Bovespa ftp site.
- **Reddit WallstreetBets API** – Provides daily top 50 stocks from reddit
  (subreddit) Wallstreetbets and their sentiments via the API.
- **td** – Interfaces the 'twelvedata' API for stocks and (digital and standard)
  currencies.
- **rbcb** – R interface to Brazilian Central Bank web services.
- **rb3** – A bunch of downloaders and parsers for data delivered from B3.
- **simfinapi** – Makes 'SimFin' data (https://simfin.com/) easily accessible in
  R.
- **tidyfinance** – Tidy Finance helper functions to download financial data and
  process the raw data into a structured Format (tidy data), including date
  conversion, scaling factor values, and filtering by the specified date.

### Financial Instruments and Pricing

- **RQuantLib** – RQuantLib connects GNU R with QuantLib.
- **quantmod** – Quantitative Financial Modelling Framework.
- **Rmetrics** – The premier open source software solution for teaching and
  training quantitative finance.
- **fAsianOptions** – EBM and Asian Option Valuation.
- **fAssets** – Analysing and Modelling Financial Assets.
- **fBasics** – Markets and Basic Statistics.
- **fBonds** – Bonds and Interest Rate Models.
- **fExoticOptions** – Exotic Option Valuation.
- **fOptions** – Pricing and Evaluating Basic Options.
- **fPortfolio** – Portfolio Selection and Optimization.
- **portfolio** – Analysing equity portfolios.
- **sparseIndexTracking** – Portfolio design to track an index.
- **covFactorModel** – Covariance matrix estimation via factor models.
- **riskParityPortfolio** – Blazingly fast design of risk parity portfolios.
- **sde** – Simulation and Inference for Stochastic Differential Equations.
- **YieldCurve** – Modelling and estimation of the yield curve.
- **SmithWilsonYieldCurve** – Constructs a yield curve by the Smith-Wilson
  method from a table of LIBOR and SWAP rates.
- **ycinterextra** – Yield curve or zero-coupon prices interpolation and
  extrapolation.
- **AmericanCallOpt** – This package includes pricing function for selected
  American call options with underlying assets that generate payouts.
- **VarSwapPrice** – Pricing a variance swap on an equity index.
- **RND** – Risk Neutral Density Extraction Package.
- **LSMonteCarlo** – American options pricing with Least Squares Monte Carlo
  method.
- **OptHedging** – Estimation of value and hedging strategy of call and put
  options.
- **tvm** – Time Value of Money Functions.
- **OptionPricing** – Option Pricing with Efficient Simulation Algorithms.
- **credule** – Credit Default Swap Functions.
- **derivmkts** – Functions and R Code to Accompany Derivatives Markets.
- **FinCal** – Package for time value of money calculation, time series analysis
  and computational finance.
- **r-quant** – R code for quantitative analysis in finance.
- **options.studies** – options trading studies functions for use with
  options.data package and shiny.
- **PortfolioAnalytics** – Portfolio Analysis, Including Numerical Methods for
  Optimizationof Portfolios.
- **fmbasics** – Financial Market Building Blocks.
- **R-fixedincome** – Fixed income tools for R.

### Trading

- **backtest** – Exploring Portfolio-Based Conjectures About Financial
  Instruments.
- **pa** – Performance Attribution for Equity Portfolios.
- **TTR** – Technical Trading Rules.
- **QuantTools** – Enhanced Quantitative Trading Modelling.
- **blotter** – Transaction infrastructure for defining instruments,
  transactions, portfolios and accounts for trading systems and simulation.
  Provides portfolio support for multi-asset class and multi-currency
  portfolios. Actively maintained and developed.

### Backtesting

- **quantstrat** – Transaction-oriented infrastructure for constructing trading
  systems and simulation. Provides support for multi-asset class and
  multi-currency portfolios for backtesting and other financial research.

### Risk Analysis

- **PerformanceAnalytics** – Econometric tools for performance and risk
  analysis.

### Factor Analysis

- **FactorAnalytics** – The FactorAnalytics package contains fitting and
  analysis methods for the three main types of factor models used in conjunction
  with portfolio construction, optimization and risk management, namely
  fundamental factor models, time series factor models and statistical factor
  models.
- **Expected Returns** – Solutions for enhancing portfolio diversification and
  replications of seminal papers with R, most of which are discussed in one of
  the best investment references of the recent decade, Expected Returns: An
  Investors Guide to Harvesting Market Rewards by Antti Ilmanen.

### Time Series

- **tseries** – Time Series Analysis and Computational Finance.
- **fGarch** – Rmetrics - Autoregressive Conditional Heteroskedastic Modelling.
- **timeSeries** – Rmetrics - Financial Time Series Objects.
- **rugarch** – Univariate GARCH Models.
- **rmgarch** – Multivariate GARCH Models.
- **tidypredict** – Run predictions inside the database
  https://tidypredict.netlify.com/.
- **tidyquant** – Bringing financial analysis to the tidyverse.
- **timetk** – A toolkit for working with time series in R.
- **tibbletime** – Built on top of the tidyverse, tibbletime is an extension
  that allows for the creation of time aware tibbles through the setting of a
  time index.
- **matrixprofile** – Time series data mining library built on top of the novel
  Matrix Profile data structure and algorithms.
- **garchmodels** – A parsnip backend for GARCH models.

### Calendars

- **timeDate** – Chronological and Calendar Objects
- **bizdays** – Business days calculations and utilities

## Matlab

### FrameWorks

- **QUANTAXIS** – Integrated Quantitative Toolbox with Matlab.
- **PROJ_Option_Pricing_Matlab** – Quant Option Pricing - Exotic/Vanilla:
  Barrier, Asian, European, American, Parisian, Lookback, Cliquet, Variance
  Swap, Swing, Forward Starting, Step, Fader

## Julia

### General

- **Lucky.jl** – Modular, asynchronous trading engine in pure Julia.
- **QuantLib.jl** – Quantlib implementation in pure Julia.
- **Ito.jl** – A Julia package for quantitative finance.
- **TALib.jl** – A Julia wrapper for TA-Lib.
- **IncTA.jl** – Julia Incremental Technical Analysis Indicators
- **Miletus.jl** – A financial contract definition, modeling language, and
  valuation framework.
- **Temporal.jl** – Flexible and efficient time series class & methods.
- **Indicators.jl** – Financial market technical analysis & indicators on top of
  Temporal.
- **Strategems.jl** – Quantitative systematic trading strategy development and
  backtesting.
- **TimeSeries.jl** – Time series toolkit for Julia.
- **MarketTechnicals.jl** – Technical analysis of financial time series on top
  of TimeSeries.
- **MarketData.jl** – Time series market data.
- **TimeFrames.jl** – A Julia library that defines TimeFrame (essentially for
  resampling TimeSeries).
- **DataFrames.jl** – In-memory tabular data in Julia
- **TSFrames.jl** – Handle timeseries data on top of the powerful and mature
  DataFrames.jl

## Java

### General

- **Strata** – Modern open-source analytics and market risk library designed and
  written in Java.
- **JQuantLib** – JQuantLib is a free, open-source, comprehensive framework for
  quantitative finance, written in 100% Java.
- **finmath.net** – Java library with algorithms and methodologies related to
  mathematical finance.
- **quantcomponents** – Free Java components for Quantitative Finance and
  Algorithmic Trading.
- **DRIP** – Fixed Income, Asset Allocation, Transaction Cost Analysis, XVA
  Metrics Libraries.
- **ta4j** – A Java library for technical analysis.

## JavaScript

### General

- **finance.js** – A JavaScript library for common financial calculations.
- **portfolio-allocation** – PortfolioAllocation is a JavaScript library
  designed to help constructing financial portfolios made of several assets:
  bonds, commodities, cryptocurrencies, currencies, exchange traded funds
  (ETFs), mutual funds, stocks...
- **Ghostfolio** – Wealth management software to keep track of financial assets
  like stocks, ETFs or cryptocurrencies and make solid, data-driven investment
  decisions.
- **IndicatorTS** – Indicator is a TypeScript module providing various stock
  technical analysis indicators, strategies, and a backtest framework for
  trading.
- **chart-patterns** – Technical analysis library for Market Profile, Volume
  Profile, Stacked Imbalances and High Volume Node indicators.
- **orderflow** – Orderflow trade aggregator for building Footprint Candles from
  exchange websocket data.
- **ccxt** – A JavaScript / Python / PHP cryptocurrency trading API with support
  for more than 100 bitcoin/altcoin exchanges.
- **PENDAX** – Javascript SDK for Trading/Data API and Websockets for FTX,
  FTXUS, OKX, Bybit, & More.

## Data Visualization

### General

- **QUANTAXIS_Webkit** – An awesome visualization center based on quantaxis.

## Haskell

### General

- **quantfin** – quant finance in pure haskell.
- **Haxcel** – Excel Addin for Haskell.
- **Ffinar** – A financial maths library in Haskell.

## Scala

### General

- **QuantScale** – Scala Quantitative Finance Library.
- **Scala Quant** – Scala library for working with stock data from IFTTT recipes
  or Google Finance.

## Ruby

### General

- **Jiji** – Open Source Forex algorithmic trading framework using OANDA REST
  API.

## Elixir/Erlang

### General

- **Tai** – Open Source composable, real time, market data and trade execution
  toolkit.
- **Workbench** – From Idea to Execution - Manage your trading operation across
  a globally distributed cluster
- **Prop** – An open and opinionated trading platform using productive &
  familiar open source libraries and tools for strategy research, execution and
  operation.

## Golang

### General

- **Kelp** – Kelp is an open-source Golang algorithmic cryptocurrency trading
  bot that runs on centralized exchanges and Stellar DEX (command-line usage and
  desktop GUI).
- **marketstore** – DataFrame Server for Financial Timeseries Data.
- **IndicatorGo** – IndicatorGo is a Golang module providing various stock
  technical analysis indicators, strategies, and a backtest framework for
  trading.

## CPP

### General

- **QuantLib** – The QuantLib project is aimed at providing a comprehensive
  software framework for quantitative finance.
- **QuantLibRisks** – Fast risks with QuantLib in C++
- **XAD** – Automatic Differentation (AAD) Library
- **TradeFrame** – C++ 17 based framework/library (with sample applications) for
  testing options based automated trading ideas using DTN IQ real time data feed
  and Interactive Brokers (TWS API) for trade execution. Comes with built-in
  Option Greeks/IV calculation library.
- **Hikyuu** – A base on Python/C++ open source high-performance quant framework
  for faster analysis and backtesting, contains the complete trading system
  components for reuse and combination. You can use python or c++ freely.

## Frameworks

### General

- **QuantLib** – The QuantLib project is aimed at providing a comprehensive
  software framework for quantitative finance.
- **QuantLibRisks** – Fast risks with QuantLib in Python and C++
- **XAD** – Automatic Differentiation (AAD) Library in Python and C++
- **JQuantLib** – Java port.
- **RQuantLib** – R port.
- **QuantLibAddin** – Excel support.
- **QuantLibXL** – Excel support.
- **QLNet** – .Net port.
- **PyQL** – Python port.
- **QuantLib.jl** – Julia port.
- **QuantLib-Python Documentation** – Documentation for the Python bindings for
  the QuantLib library
- **TA-Lib** – perform technical analysis of financial market data.

### ta-lib-python

### ta-lib

- **Portfolio Optimizer** – Portfolio Optimizer is a Web API for portfolio
  analysis and optimization.

### XAD: Automatic Differentation (AAD) Library for Python and C++

## CSharp

### General

- **QuantConnect** – Lean Engine is an open-source fully managed C# algorithmic
  trading engine built for desktop and cloud usage.
- **StockSharp** – Algorithmic trading and quantitative trading open source
  platform to develop trading robots (stock markets, forex, crypto, bitcoins,
  and options).
- **TDAmeritrade.DotNetCore** – Free, open-source .NET Client for the TD
  Ameritrade Trading Platform. Helps developers integrate TD Ameritrade API into
  custom trading solutions.

## Rust

### General

- **QuantMath** – Financial maths library for risk-neutral pricing and risk
- **Barter** – Open-source Rust framework for building event-driven live-trading
  & backtesting systems
- **LFEST** – Simulated perpetual futures exchange to trade your strategy
  against.
- **TradeAggregation** – Aggregate trades into user-defined candles using
  information driven rules.
- **SlidingFeatures** – Chainable tree-like sliding windows for signal
  processing and technical analysis.
- **RustQuant** – Quantitative finance library written in Rust.
- **finalytics** – A rust library for financial data analysis.

## Reproducing Works, Training & Books

### General

- **Auto-Differentiation Website** – Background and resources on Automatic
  Differentiation (AD) / Adjoint Algorithmic Differentitation (AAD).
- **Derman Papers** – Notebooks that replicate original quantitative finance
  papers from Emanuel Derman.
- **ML-Quant** – Top Quant resources like ArXiv (sanity), SSRN, RePec, Journals,
  Podcasts, Videos, and Blogs.
- **volatility-trading** – A complete set of volatility estimators based on Euan
  Sinclair's Volatility Trading.
- **quant** – Quantitative Finance and Algorithmic Trading exhaust; mostly
  ipython notebooks based on Quantopian, Zipline, or Pandas.
- **fecon235** – Open source project for software tools in financial economics.
  Many jupyter notebook to verify theoretical ideas and practical methods
  interactively.
- **Quantitative-Notebooks** – Educational notebooks on quantitative finance,
  algorithmic trading, financial modelling and investment strategy
- **QuantEcon** – Lecture series on economics, finance, econometrics and data
  science; QuantEcon.py, QuantEcon.jl, notebooks
- **FinanceHub** – Resources for Quantitative Finance
- **Python_Option_Pricing** – An library to price financial options written in
  Python. Includes: Black Scholes, Black 76, Implied Volatility, American,
  European, Asian, Spread Options.
- **python-training** – J.P. Morgan's Python training for business analysts and
  traders.
- **Stock_Analysis_For_Quant** – Different Types of Stock Analysis in Excel,
  Matlab, Power BI, Python, R, and Tableau.
- **algorithmic-trading-with-python** – Source code for Algorithmic Trading with
  Python (2020) by Chris Conlan.
- **MEDIUM_NoteBook** – Repository containing notebooks of cerlymarco's posts on
  Medium.
- **QuantFinance** – Training materials in quantitative finance.
- **IPythonScripts** – Tutorials about Quantitative Finance in Python and
  QuantLib: Pricing, xVAs, Hedging, Portfolio Optimisation, Machine Learning and
  Deep Learning.
- **Computational-Finance-Course** – Materials for the course of Computational
  Finance.
- **Machine-Learning-for-Asset-Managers** – Implementation of code snippets,
  exercises and application to live data from Machine Learning for Asset
  Managers (Elements in Quantitative Finance) written by Prof. Marcos López de
  Prado.
- **Python-for-Finance-Cookbook** – Python for Finance Cookbook, published by
  Packt.
- **modelos_vol_derivativos** – "Modelos de Volatilidade para Derivativos"
  book's Jupyter notebooks
- **NMOF** – Functions, examples and data from the first and the second edition
  of "Numerical Methods and Optimization in Finance" by M. Gilli, D. Maringer
  and E. Schumann (2019, ISBN:978-0128150658).
- **py4fi2nd** – Jupyter Notebooks and code for Python for Finance (2nd ed.,
  O'Reilly) by Yves Hilpisch.
- **aiif** – Jupyter Notebooks and code for the book Artificial Intelligence in
  Finance (O'Reilly) by Yves Hilpisch.
- **py4at** – Jupyter Notebooks and code for the book Python for Algorithmic
  Trading (O'Reilly) by Yves Hilpisch.
- **dawp** – Jupyter Notebooks and code for Derivatives Analytics with Python
  (Wiley Finance) by Yves Hilpisch.
- **dx** – DX Analytics | Financial and Derivatives Analytics with Python.
- **QuantFinanceBook** – Quantitative Finance book.
- **rough_bergomi** – A Python implementation of the rough Bergomi model.
- **frh-fx** – A python implementation of the fast-reversion Heston model of
  Mechkov for FX purposes.
- **Value Investing Studies** – A collection of data analysis studies that
  examine the performance and characteristics of value investing over long
  periods of time.
- **Machine Learning Asset Management** – Machine Learning in Asset Management
  (by @firmai).
- **Deep Learning Machine Learning Stock** – Deep Learning and Machine Learning
  stocks represent a promising long-term or short-term opportunity for investors
  and traders.
- **Technical Analysis and Feature Engineering** – Feature Engineering and
  Feature Importance of Machine Learning in Financial Market.
- **Differential Machine Learning and Axes that matter by Brian Huge and Antoine
  Savine** – Implement, demonstrate, reproduce and extend the results of the
  Risk articles 'Differential Machine Learning' (2020) and 'PCA with a
  Difference' (2021) by Huge and Savine, and cover implementation details left
  out from the papers.
- **systematictradingexamples** – Examples of code related to book Systematic
  Trading and blog
- **pysystemtrade_examples** – Examples using pysystemtrade for Robert Carver's
  blog.
- **ML_Finance_Codes** – Machine Learning in Finance: From Theory to Practice
  Book
- **Hands-On Machine Learning for Algorithmic Trading** – Hands-On Machine
  Learning for Algorithmic Trading, published by Packt
- **financialnoob-misc** – Codes from @financialnoob's posts
- **MesoSim Options Trading Strategy Library** – Free and public Options Trading
  strategy library for MesoSim.
- **Quant-Finance-With-Python-Code** – Repo for code examples in Quantitative
  Finance with Python by Chris Kelliher
- **QuantFinanceTraining** – This repository contains codes that were executed
  during my training in the CQF (Certificate in Quantitative Finance). The codes
  are organized by class, facilitating navigation and reference.
- **Statistical-Learning-based-Portfolio-Optimization** – This R Shiny App
  utilizes the Hierarchical Equal Risk Contribution (HERC) approach, a modern
  portfolio optimization method developed by Raffinot (2018).
- **book_irds3** – Code repository for Pricing and Trading Interest Rate
  Derivatives.
- **Autoencoder-Asset-Pricing-Models** – Reimplementation of Autoencoder Asset
  Pricing Models (GKX, 2019).
- **Finance** – 150+ quantitative finance Python programs to help you gather,
  manipulate, and analyze stock market data.
- **101_formulaic_alphas** – Implementation of 101 formulaic alphas using
  qstrader.
- **Tidy Finance** – An opinionated approach to empirical research in financial
  economics - a fully transparent, open-source code base in multiple programming
  languages (Python and R) to enable the reproducible implementation of
  financial research projects for students and practitioners.
- **RoughVolatilityWorkshop** – 2024 QuantMind's Rough Volatility Workshop
  lectures.
- **AFML** – All the answers for exercises from Advances in Financial Machine
  Learning by Dr Marco Lopez de Parodo.
