# Relay Nodes

> **Historical note:** This concept was previously called **NearbyNode**. The name was updated to "Relay Nodes" as the product naming matured. No code rename has occurred.

## What It Is

**Relay Nodes** extend Locaily beyond one machine. The relay protocol (registry, connector, router, placement planner, cross-node step routing with local fallback) is implemented for Local Brain instances on nearby machines. Future targets include phones, tablets, edge boxes, and browser-connected peers — see the deferred px milestones for trust boundary and pairing work.

A Relay Node does not need an AI model. It exposes **capabilities**—files, sensors, UI hooks, APIs, compute—through trusted connectors. The Local Brain coordinates Relay Node capabilities.

## What It Owns (Target)

- Device identity and presence on the local network
- Capability advertisements (what this node can do)
- Secure connector protocol between Local Brain and the node
- Execution of non-model capabilities (files, sensors, UI hooks, APIs)
- Optional delegated model runtime on capable hardware

## What It Does Not Own

- Global orchestration policy (Local Brain)
- Tool pack manifests and workflow definitions
- Public internet exposure by default

## Core Principle

**Device = capability. Device ≠ model.**

Not every node needs a model. Every node needs a **connector** so Local Brain can route work to the right place.

Examples of capabilities that might live on a Relay Node:

- Read a folder the main PC cannot access
- Run a mobile-only API or sensor
- Offload a small inference job to a GPU on another local machine
- Provide a browser bridge on a second device

## Communicates With

- **Local Brain** — registration, health, task delegation, result return
- **Clients** — indirectly; clients talk to Local Brain, not directly to every node (target design)

## Status

**Experimental / not implemented.**

No Relay Node discovery service, protocol, or reference connector exists in the current codebase. This doc captures direction from project vision and research notes only.

## Still Undecided

- Discovery mechanism (mDNS, manual pairing, QR code, etc.)
- Auth model between nodes
- Whether nodes run a thin agent or only respond to Local Brain
- How permissions map across devices
- Offline / split-brain behavior

## Related Research

- `docs/99-archive/raw-conversation-captures/Local AI Pit Crew Documentation.docx`
- `docs/99-archive/raw-conversation-captures/Local AI Engine Evolution.txt`
