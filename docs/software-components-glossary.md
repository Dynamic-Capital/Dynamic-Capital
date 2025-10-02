# Software Components and Architecture Glossary

This glossary summarises foundational software building blocks, the lifecycle
artifacts teams produce, and specialised terminology that appears in modern,
distributed, and AI-augmented systems. Use it as a quick reference when mapping
requirements to implementation choices or clarifying vocabulary during
cross-functional discussions.

## Core software architecture and components

- **Application (App)**: A standalone program that fulfils a task for an end
  user or another system, often composed of multiple modules and services.
- **System**: A holistic collection of software, hardware, data stores, and
  operational processes that collaborate to deliver a complete solution.
- **Framework**: An opinionated foundation that provides structure, control
  flow, and reusable primitives for building applications, typically inverting
  control compared with libraries.
- **Library**: A reusable collection of functions, classes, or routines that
  developers call from their own code without surrendering overall control flow.
- **Module**: A self-contained unit of code that encapsulates related
  functionality, encouraging modular design and code reuse.
- **Microservice**: An independently deployable service that owns a bounded
  context within a larger application and communicates with peers through APIs
  or messaging.
- **API (Application Programming Interface)**: A contract that specifies how
  software components interact, including endpoints, payloads, and expected
  behaviours.
- **Middleware**: Software that mediates between applications or services and
  lower-level infrastructure, handling concerns such as communication,
  orchestration, and data management.
- **Container**: A portable runtime bundle that packages an application with its
  dependencies, enabling consistent execution across environments.

## Software development process artifacts

Artifacts capture the by-products and documentation created throughout the
software lifecycle.

- **Artifact**: Any produced item—code, documentation, design diagrams, scripts,
  binaries, or logs—generated during development or operations.
- **Script**: An executable file that automates tasks such as testing,
  deployment, infrastructure provisioning, or data processing.
- **Repository**: A version-controlled storage location that tracks source code,
  configuration, assets, and history for collaborative work.
- **Log**: A chronological record of an application’s events, performance
  metrics, or errors used for observability and troubleshooting.

## Tools and utilities

- **Debugger**: A diagnostic tool that allows developers to inspect runtime
  state, step through execution, and identify the source of defects.
- **Compiler**: Software that translates source code into a lower-level
  representation (such as machine code or bytecode) for execution.
- **Simulator**: A program that models the behaviour of another system—hardware,
  software, or physical processes—to enable testing and analysis without the
  real environment.
- **Orchestrator**: An automation layer that coordinates complex workflows,
  deployments, or service interactions, especially in microservice or
  containerised ecosystems.

## Architectural patterns and interaction components

- **Connector**: A runtime construct that governs how components
  communicate—examples include network sockets, REST calls, and message
  channels.
- **Gateway**: A specialised entry point that consolidates access to multiple
  services, enforcing routing, security, and cross-cutting policies.
- **Message Broker (Message Queue)**: Infrastructure that enables asynchronous
  communication by receiving, storing, and delivering messages between producers
  and consumers.

## Specialised AI-related terms

- **Assistant**: A conversational interface that responds to user prompts but
  relies on direct guidance for actions and decision-making.
- **Copilot**: An AI helper embedded in human workflows (such as coding or
  writing) that suggests or completes tasks while the human remains in control.
- **System (AI)**: A composite AI solution comprising multiple interacting
  components—agents, tools, data pipelines, and orchestration layers.
- **Tool (AI)**: A callable capability, such as an API, function, or plug-in,
  that an AI agent or system uses to perform specific operations or retrieve
  information.

## Using the glossary

- Align on terminology during design reviews and architecture discussions to
  avoid ambiguity between teams.
- Map requirements to components: for example, decide whether a new capability
  belongs in an existing microservice, a reusable library, or a standalone
  application.
- Reference artifacts when setting up processes—for instance, determining which
  scripts handle deployment or how logs feed observability dashboards.

Maintaining a shared vocabulary reduces miscommunication, speeds up onboarding,
and clarifies which parts of a complex platform are responsible for specific
behaviours.
