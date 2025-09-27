# MQL5 Learning Roadmap

This roadmap structures a progression from foundational MetaTrader skills to
advanced trading automation and integrations. Each phase builds upon the
previous one with focused objectives, essential concepts, and project ideas that
reinforce practical learning.

## Phase 1 – Foundations

**Goal:** Become comfortable with MetaEditor and basic programming constructs.

**Key Activities**

- Install MetaTrader 5 and explore the MetaEditor environment.
- Practice creating, compiling, and debugging simple scripts.
- Review fundamental programming topics:
  - Data types: `int`, `double`, `string`, `bool`, `datetime`.
  - Variables, arrays, and scope.
  - Operators: arithmetic, logical, comparison.
  - Control flow: `if`/`else`, loops, `switch`.
  - Core functions: `OnStart`, user-defined functions, parameters, and return
    values.

**Milestone Project:** Write a script that prints diagnostic information and
handles compile-time errors.

## Phase 2 – Procedural Programming

**Goal:** Gain confidence building functional MQL5 scripts.

**Key Activities**

- Deepen understanding of expressions and statements.
- Work with fixed, dynamic, and timeseries arrays.
- Explore the preprocessor: `#define`, `#include`, and macros.
- Organize logic across multiple files for modularity.

**Milestone Project:** Build a script that reads symbol data, performs
calculations, and prints results.

## Phase 3 – Object-Oriented Programming (OOP)

**Goal:** Structure code for maintainability using MQL5 OOP features.

**Key Activities**

- Implement classes, structures, inheritance, and polymorphism.
- Utilize constructors, destructors, and method overloading.
- Experiment with virtual methods, templates, and namespaces.

**Milestone Project:** Create a reusable indicator or trade manager class.

## Phase 4 – Working with Built-in APIs

**Goal:** Master the standard libraries bundled with MQL5.

**Key Activities**

- Manipulate strings and arrays: concatenation, searching, sorting, logging.
- Apply math utilities: rounding, trigonometry, random numbers, powers.
- Handle files for text and binary storage.
- Use time utilities for server/local synchronization and counters.
- Design user interaction flows with alerts, messages, and chart dialogs.

**Milestone Project:** Implement a logging utility that persists entries to disk
and supports file read/write.

## Phase 5 – Building Application Types

**Goal:** Understand program types and event-driven patterns.

**Key Activities**

- Compare scripts, indicators, expert advisors (EAs), and services.
- Use event handlers: `OnInit`, `OnDeinit`, `OnTick`, `OnTimer`, `OnChartEvent`.
- Work with timeseries utilities: `CopyRates`, `CopyTicks`, `BarShift`.
- Draw chart objects such as trendlines, Fibonacci tools, and Gann elements.

**Milestone Project:** Develop a custom moving average indicator with chart
annotations.

## Phase 6 – Trading Automation

**Goal:** Design expert advisors with solid risk management.

**Key Activities**

- Manage orders, positions, and deals.
- Send trade requests with `OrderSend` and validate using `OrderCheck`.
- Configure stop loss, take profit, and trailing stops.
- Coordinate multi-symbol and multi-timeframe strategies.
- Backtest in the Strategy Tester and iterate through optimizations.

**Milestone Project:** Ship an EA that executes trades with configurable risk
controls.

## Phase 7 – Advanced Integrations

**Goal:** Connect MQL5 solutions to external technologies.

**Key Activities**

- Define custom symbols and embed resources.
- Integrate the economic calendar for event-aware strategies.
- Apply cryptographic utilities for secure data handling.
- Work with networking APIs: HTTP, FTP, sockets.
- Persist data via SQLite (ORM, CRUD) and coordinate with Python integrations.
- Accelerate compute-heavy workloads using OpenCL.

**Milestone Project:** Build an EA that leverages a Python machine learning
model for trade predictions.

## Final Phase – Mastery

**Goal:** Operate as a professional MQL5 developer.

**Key Activities**

- Maintain a portfolio of custom indicators and risk-managed expert advisors.
- Combine SQLite storage, Python analytics, and MQL5 execution for data-driven
  strategies.
- Publish polished tools on the MQL5 Market and support end users.

**Milestone Project:** Deliver a production-ready trading toolkit that
integrates the complete stack from data ingestion to automated execution.
