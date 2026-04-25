---
trigger: always_on
---

---
trigger: always_on
---

# Ecosystem UI Rules (EV Suite: Charging + Fleet + Energy)

## 1. Design System (STRICT)
- Use the same color palette as the core EV app  
- Primary color must remain consistent across all modules  
- Background colors must align with base app (light/dark support maintained structurally)  

## 2. Typography
- Use the same font family as the EV base app  
- Title: Bold, large size  
- Subtitle: Medium weight  
- Body: Regular  
- Maintain consistent font scaling across all modules  

## 3. Spacing & Layout
- Use 16px standard padding across all screens  
- Maintain consistent card spacing and margins  
- Use uniform border radius (12px or 16px as defined in base system)  

## 4. Components (MANDATORY REUSE)
All modules MUST reuse:
- AppBar style  
- Card design  
- Buttons (primary & secondary)  
- Input fields  
- List tiles  

**Do NOT introduce new component styles unless strictly required.**

## 5. Navigation Pattern
- Maintain the same navigation structure as base EV app  
- Bottom Navigation OR Top Tabs  
- Preserve identical transitions and motion behavior  

## 6. Screen Structure (VERY IMPORTANT)
Each screen must follow:
- Header (Title + Action)  
- Summary Section (Charging stats / Fleet status / Energy usage where applicable)  
- Main Content (Stations / Sessions / Vehicles / Logs)  
- Floating Action Button (if required)  

## 7. Card UI Pattern
All data representation must adhere to a unified card system:
- Consistent elevation and shadow  
- Uniform padding  
- Identical layout structure  

**Example mappings:**
- Charging → Session Card  
- Fleet → Vehicle Card  
- Energy → Usage Card  

## 8. FAB (Floating Action Button)
- Fixed position (bottom right)  
- Consistent size and styling  
- Standardized interaction pattern  

## 9. Icons
- Use a unified icon library  
- Maintain consistent icon size, stroke, and color behavior  

## 10. Animations
- Subtle, refined motion only  
- Consistent duration and easing curves across modules  

## 11. Naming Consistency
Maintain structured naming conventions:
- ChargingCard  
- VehicleCard  
- UsageCard  

## 12. State Handling UI
- Loading → Unified loader pattern  
- Empty State → Consistent placeholder design  
- Error State → Standardized error representation  

## 13. Form UI
- Input fields must align with base EV app styling  
- Buttons must follow primary CTA hierarchy  

## 14. DO NOT
- Do NOT introduce new UI paradigms  
- Do NOT alter spacing inconsistently  
- Do NOT mix interaction patterns  

## 15. VALIDATION STEP (MANDATORY)
Before final output:
- Validate alignment with base EV app  
- Verify spacing consistency  
- Ensure component reuse integrity  

**Reject output if any deviation is observed**

---

# Team Integration Rules (Adjusted for System Integrity)

## 16. UI Consistency Across Users
- User avatars, names, and identity representation must remain visually consistent across all modules  

## 17. Validation (System Integrity)
Before final output:
- Ensure user representation consistency  
- Validate task/operation alignment within existing system constraints  