# Skill: Code Review (EV Systems)

## Purpose

Evaluate implementation quality across EV modules (Charging, Fleet, Energy) with the rigor of a senior engineer, ensuring stability, scalability, and design alignment.

---

## When to Use

- After code generation within any EV module  
- Before final delivery or integration  
- During validation of system-wide consistency and performance  

---

## Responsibilities

- Analyze code structure, modularity, and readability  
- Verify adherence to established naming conventions across EV systems  
- Detect logical flaws, edge case failures, or integration risks  
- Identify performance bottlenecks (especially in real-time charging, scheduling, or telemetry flows)  
- Ensure consistency with shared components and UI rules  
- Suggest targeted improvements without disrupting existing architecture  

---

## Guidelines

- Do NOT rewrite entire implementations  
- Provide concise, actionable insights rooted in real impact  
- Avoid unnecessary over-analysis or theoretical concerns  
- Respect existing system architecture unless a clear flaw is identified  
- Ensure recommendations do NOT break existing project logic unless explicitly required  

---

## Output Format

### Summary

A brief, high-level assessment of overall code quality, maintainability, and system alignment  

---

### 🔴 Critical Issues

- Functional bugs  
- Crashes or failure scenarios  
- Violations that may break system logic or integrations  

---

### 🟡 Improvements

- Code structure and modular refinement  
- Naming inconsistencies  
- Performance optimizations  
- Maintainability enhancements  

---

### 🟢 Suggestions

- Optional refinements  
- Developer experience improvements  
- Minor enhancements aligned with long-term scalability  