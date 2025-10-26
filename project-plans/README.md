# Singleton Integrity Project - Documentation Suite

**A complete project plan to ensure all singletons are respected as singletons throughout the NFT Studio codebase.**

---

## What's Included

This suite contains everything you need to understand, audit, and maintain singleton integrity across your application.

### 📋 Core Documents

#### 1. **SINGLETON_INTEGRITY_PLAN.md** (Main Document)
**The complete, strategic guide** - Start here.
- Executive summary of the problem and solution
- Current state assessment with audit results
- Risk analysis and governance rules
- Detailed implementation roadmap (Phases 1-4)
- Key metrics for success
- Technical deep dives on singleton patterns

**Read this if you want**: The big picture, strategic direction, and architecture overview.

**Time to read**: 30-40 minutes

---

#### 2. **SINGLETON_IMPLEMENTATION_CHECKLIST.md** (Tactical Guide)
**The hands-on execution plan** - Use this to track progress.
- Step-by-step tasks for Phases 1-4
- Specific file locations and code snippets
- Checkboxes for each subtask
- Expected outcomes for each phase
- Timeline and effort estimates

**Read this if you want**: To actually implement the plan, track progress, and know exactly what to do next.

**Time to reference**: Throughout 4-week implementation period

---

#### 3. **SINGLETON_QUICK_REFERENCE.md** (Developer Guide)
**The pocket reference card** - Keep this handy always.
- 30-second version of the entire concept
- Table of all current singletons with access patterns
- ✅ Correct patterns (with code examples)
- ❌ Anti-patterns (what NOT to do)
- How to spot violations and debug them
- Checklist for adding new singletons

**Read this if you want**: Quick answers while coding. Perfect to share with future contributors.

**Time to reference**: 2-3 minutes per lookup

---

#### 4. **SINGLETON_AUDIT_TEMPLATE.md** (Audit Framework)
**The verification checklist** - Use this to verify your code.
- Sections for each singleton to verify
- Direct instantiation search results (already provided)
- Specific audit scripts to run
- Edge cases to check
- Status tracking and sign-off section

**Read this if you want**: To know what to audit and how to document findings.

**Time to reference**: During Phase 1 audit

---

## Quick Navigation by Use Case

### "I need to understand what singletons are and why they matter"
→ Read: **SINGLETON_INTEGRITY_PLAN.md** sections 1-3 and Part 9

### "I need to add a new singleton to the system"
→ Read: **SINGLETON_QUICK_REFERENCE.md** → "Checklist: Adding a New Singleton"

### "I found a bug that looks like duplicate instances"
→ Read: **SINGLETON_QUICK_REFERENCE.md** → "Singleton Violations: How to Spot Them"

### "I'm implementing this plan and need to know what to do next"
→ Read: **SINGLETON_IMPLEMENTATION_CHECKLIST.md** → Current phase

### "I need to onboard a new team member on our singleton pattern"
→ Share: **SINGLETON_QUICK_REFERENCE.md** + doc link to `docs/SINGLETON_GOVERNANCE.md` (which you'll create)

### "I'm doing code review and need to check if something violates the pattern"
→ Use: **SINGLETON_QUICK_REFERENCE.md** → "Correct Patterns" vs "Anti-Patterns"

### "I need to audit whether our codebase respects singletons"
→ Follow: **SINGLETON_AUDIT_TEMPLATE.md** section by section

---

## Document Relationships

```
                    SINGLETON_INTEGRITY_PLAN.md
                    (Strategic Overview)
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   PHASE 1: AUDIT    PHASE 2: GUARDRAILS  PHASE 3: DOCS
        ↓                  ↓                  ↓
   Use AUDIT        Use CHECKLIST +    Create in
   TEMPLATE.md      QUICK_REF.md       docs/ folder
        ↓                  ↓                  ↓
   Create          Add ESLint +       SINGLETON_
   AUDIT_RESULTS   Tests               GOVERNANCE.md
        ↓                  ↓                  ↓
   ────────────────────────────────────────────────
                        ↓
         QUICK_REFERENCE.md
         (For ongoing use by team)
```

---

## What's the Current State?

### ✅ Good News
- Your architecture is **sound**
- No violations detected in production code (`src/`)
- ApplicationFactory correctly manages singletons
- Dependency injection pattern is well-implemented
- Tests properly isolate with their own instances

### ⚠️ What Needs Checking
- FrontendServiceFactory caching behavior (likely OK, needs verification)
- UtilsFactory singleton behavior (likely OK, needs verification)
- Plugin system integration (if applicable)
- Context provider patterns

### 🎯 What This Plan Provides
1. **Verification framework** to confirm everything is good
2. **Automated guardrails** (ESLint + tests) to prevent future violations
3. **Clear documentation** for your team
4. **Governance rules** for adding singletons going forward

---

## Implementation Timeline

| Phase | What | Time | Status |
|-------|------|------|--------|
| 1 | Audit & verify existing code | 1-2 weeks | ⏳ Start here |
| 2 | Add ESLint rules & tests | 1 week | ⏳ After Phase 1 |
| 3 | Write documentation | 1 week | ⏳ After Phase 2 |
| 4 | Optional enhancements | 1+ weeks | ✨ Nice-to-have |

**Total: 4 weeks of solo work, ~10-15 hours per week**

---

## How to Start

### Today (Right Now)
1. ✅ You have this README and 3 core plans
2. 📖 Read **SINGLETON_INTEGRITY_PLAN.md** sections 1-3 (20 mins)
3. 💾 Save **SINGLETON_QUICK_REFERENCE.md** as browser bookmark or IDE note
4. 📝 Begin Phase 1 using **SINGLETON_IMPLEMENTATION_CHECKLIST.md**

### This Week
1. Complete Phase 1 audit tasks (see checklist)
2. Document findings in AUDIT_RESULTS.md
3. Share results with yourself in a note/doc

### Next Week
1. Implement Phase 2 guardrails
2. Commit ESLint rule, tests, and runtime check
3. Verify CI/CD picks them up

### Following Weeks
1. Create documentation
2. Optional enhancements
3. Team celebration! 🎉

---

## Key Insights from the Plan

### Why This Matters
Your app has state and services that **must exist as exactly one instance**:
- ProjectStateManager (your source of truth)
- EventBusService (how components communicate)
- CommandService (undo/redo history)

If you accidentally create two instances, you get:
- 🔥 State inconsistency
- 🔥 Events that don't deliver
- 🔥 Undo/redo not working
- 🔥 Hard-to-debug bugs

This plan prevents that.

### The Core Rule
```
Never use: new ServiceName()
Always use: appFactory.getServiceName()
```

That one rule, if followed, maintains singleton integrity forever.

### Why Automated Checks Matter
Code review can miss violations. Automated checks catch them:
- ESLint prevents new violations
- Tests verify singleton identity
- Runtime checks detect anomalies

Once set up, you're protected without extra effort.

---

## File Locations

**You'll create these documents:**
```
project-plans/
├── README.md (this file - already here)
├── SINGLETON_INTEGRITY_PLAN.md (strategic guide - already here)
├── SINGLETON_IMPLEMENTATION_CHECKLIST.md (execution guide - already here)
├── SINGLETON_QUICK_REFERENCE.md (pocket guide - already here)
├── SINGLETON_AUDIT_TEMPLATE.md (audit framework - already here)
├── AUDIT_RESULTS.md (to create during Phase 1)
└── COMMENT_TEMPLATES.md (to create during Phase 3)

docs/
├── SINGLETON_GOVERNANCE.md (to create during Phase 3)
└── SINGLETON_TROUBLESHOOTING.md (to create during Phase 3)
```

---

## FAQ

### Q: Is our code already broken?
**A:** No! Audit shows no violations in production code. Architecture is sound.

### Q: How long does this actually take?
**A:** 4 weeks for solo developer, working 10-15 hours/week. Can be accelerated.

### Q: What's the minimum I should do?
**A:** Phase 1 (audit) + Phase 2 (guardrails). Phase 3 is nice-to-have documentation.

### Q: Can I do this incrementally?
**A:** Yes. Each phase is independent. Start with Phase 1, move to Phase 2, etc.

### Q: What if I find violations?
**A:** The plan includes refactoring guidance. Details in SINGLETON_INTEGRITY_PLAN.md Part 5.

### Q: Do I need to stop development while doing this?
**A:** No. This runs parallel to normal development. Use .eslintrc to catch violations in new PRs.

### Q: What about tests?
**A:** Tests are explicitly exempt - they should create isolated instances. That's fine and correct.

### Q: This seems overkill for a one-person project?
**A:** It's thorough but practical. You can skip Phase 4 (enhancements). Phases 1-3 are solid investment in code quality.

---

## Success Criteria

After completing this plan, you'll have:

✅ **Clarity**: You understand exactly what singletons are and why they matter  
✅ **Verification**: You know your code respects the pattern  
✅ **Prevention**: Automated checks prevent new violations  
✅ **Documentation**: Future contributors understand the pattern  
✅ **Confidence**: You know state and services work correctly  

---

## Support & Troubleshooting

### Getting Stuck?
1. Check **SINGLETON_QUICK_REFERENCE.md** for patterns
2. Check **SINGLETON_AUDIT_TEMPLATE.md** for audit guidance
3. Review specific phase in **SINGLETON_IMPLEMENTATION_CHECKLIST.md**
4. Refer back to **SINGLETON_INTEGRITY_PLAN.md** for architecture details

### Found an Edge Case?
1. Document it
2. Add to AUDIT_RESULTS.md
3. Include in troubleshooting guide you create

### Want to Adapt the Plan?
Good! This plan is a framework, not gospel. Adapt it to your needs:
- Skip Phase 4 if you don't need enhancements
- Skip some Phase 2 items if you prefer different tools
- Add your own steps

---

## Architecture Context

### How Singletons Work in NFT Studio

```
┌─────────────────────────────────────────┐
│         React Components                 │
└────────────────┬────────────────────────┘
                 │ Via Context
                 ↓
┌─────────────────────────────────────────┐
│       ServiceContext (React)             │
│   (values come from ApplicationFactory)  │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│    ApplicationFactory (Singleton)       │
│  Manages all singletons and exposes     │
│  them via getter methods & context      │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ↓            ↓            ↓
EventBusService CommandService LoggerService
(Exported)      (Exported)     (Exported)
ProjectState    RenderPipeline PinSettings
(Lazy Init)     (Lazy Init)    (Lazy Init)
```

This structure ensures single instances everywhere.

---

## Next Steps

**Choose your path:**

### 🚀 Fast Track (Do it now)
1. Read this README (5 mins) ✅
2. Read SINGLETON_QUICK_REFERENCE.md (10 mins)
3. Skim SINGLETON_INTEGRITY_PLAN.md (15 mins)
4. Start Phase 1 checklist today

**Total: 30 minutes to get oriented**

### 🏃 Standard Track (Do it this week)
1. Read SINGLETON_INTEGRITY_PLAN.md (45 mins)
2. Read SINGLETON_QUICK_REFERENCE.md (15 mins)
3. Start Phase 1 Tuesday/Wednesday
4. Complete Phase 1 by Friday

**Total: This week's project**

### 🧘 Deep Dive (Thorough understanding)
1. Read everything in order
2. Take notes on key concepts
3. Create your own visual diagrams
4. Then start Phase 1

**Total: 2-3 hours understanding + implementation**

---

## Questions to Ask Yourself

Before starting, consider:
- Do you have time for 4 weeks?
- Can you carve out 10-15 hours per week?
- Is singleton integrity important for your project? (It is!)
- Do you want to move fast or be thorough? (Both possible!)

---

## Credits

**Created by**: Zencoder (AI Architecture Analysis)  
**For**: The Phoenix (NFT Studio Solo Developer)  
**Status**: 🟢 Ready to Implement  
**Confidence**: High - Architecture is Sound  
**Complexity**: Medium  

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Today] | Initial comprehensive suite created |

---

## Final Words

Your singleton architecture is solid. This plan makes it bulletproof.

By following these guides, you'll:
1. **Verify** everything works as intended
2. **Prevent** future violations automatically
3. **Document** the pattern for clarity
4. **Maintain** code quality effortlessly

You've got this. Let's go build something great. 🚀

---

**Start with Phase 1 checklist in: SINGLETON_IMPLEMENTATION_CHECKLIST.md**

Questions? Issues? Found improvements? Document them in AUDIT_RESULTS.md.

Good luck! 💪