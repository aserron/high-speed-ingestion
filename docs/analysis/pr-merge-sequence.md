# PR Merge Sequence Guide - Finance Ingestion Benchmark

## ⚠️ **CRITICAL: Merge Order Must Be Maintained**

To preserve the correct development history, PRs must be merged in **chronological order** based on the original development timeline.

## 📋 **Correct Merge Sequence**

### **Phase 1: Foundation and Infrastructure**
| Order | PR | Branch | Status | Dependencies |
|-------|----|---------|---------|----|
| 1 | #7 | `feat/P01-T01-monorepo-setup` | ✅ **MERGED** | None |
| 2 | TBD | `feat/P01-T02-containerization` | 🟡 **DRAFT** | Wait for #7 |
| 3 | TBD | `feat/P01-T03-shared-packages` | 🟡 **DRAFT** | Wait for T02 |

### **Phase 2: Core Framework Implementation**
| Order | PR | Branch | Status | Dependencies |
|-------|----|---------|---------|----|
| 4 | Existing | `feature/python-foundation-framework` | ❓ **CHECK** | Wait for Phase 1 |
| 5 | Existing | `feature/nodejs-foundation-framework` | ❓ **CHECK** | Wait for T04 |
| 6 | Existing | `feature/storage-layer-infrastructure` | ❓ **CHECK** | Wait for T05 |

### **Phase 3: Core Components Implementation**
| Order | PR | Branch | Status | Dependencies |
|-------|----|---------|---------|----|
| 7 | Existing | `feat/P03-T07-python-websocket-manager` | ❓ **CHECK** | Wait for Phase 2 |
| 8 | Existing | `feat/P03-T07-websocket-connection-management` | ❓ **CHECK** | Wait for T07.1 |
| 9 | Existing | `feat/P03-T08-python-message-processor` | ❓ **CHECK** | Wait for T07 |
| 10 | Existing | `feat/P03T08.3-unit-tests-message-processors` | ❓ **CHECK** | Wait for T08 |
| 11 | Existing | `feat/P03T09-storage-and-persistence-layer` | ❓ **CHECK** | Wait for T08 |

### **Phase 4: Monitoring and Observability**
| Order | PR | Branch | Status | Dependencies |
|-------|----|---------|---------|----|
| 12 | TBD | `feat/P04-T10-metrics-monitoring` | 🟡 **DRAFT** | Wait for Phase 3 |
| 13 | Existing | `feat/P04T11-python-rest-api` | ❓ **CHECK** | Wait for T10 |
| 14 | Existing | `feat/P04T11-node-rest-api` | ❓ **CHECK** | Wait for T11.1 |

### **Phase 5: Integration and Testing**
| Order | PR | Branch | Status | Dependencies |
|-------|----|---------|---------|----|
| 15 | Existing | `feat/P05T12-integration-tests` | ❓ **CHECK** | Wait for Phase 4 |
| 16 | Existing | `feat/P05T12.2-performance-regression-tests` | ❓ **CHECK** | Wait for T12.1 |
| 17 | Existing | `feat/P05T13-benchmarking-system` | ❓ **CHECK** | Wait for T12 |

### **Phase 6: Production Readiness**
| Order | PR | Branch | Status | Dependencies |
|-------|----|---------|---------|----|
| 18 | Existing | `feat/P06T14-production-config` | ❓ **CHECK** | Wait for Phase 5 |
| 19 | Existing | `feat/P06T14-deployment-automation` | ❓ **CHECK** | Wait for T14.1 |
| 20 | Existing | `feat/P06T15-final-integration` | ❓ **CHECK** | Wait for T14 |
| 21 | TBD | `feat/P06-T16-documentation` | 🟡 **DRAFT** | Wait for T15 |

## 🔧 **Merge Process**

### **Step 1: Create Missing PRs (Draft)**
```bash
# Run the script to create missing PRs as drafts
.\scripts\utils\github\create_missing_prs.ps1
```

### **Step 2: Check Existing PR Status**
```bash
# List all PRs to see current status
gh pr list --state all

# Check if existing branches have PRs
gh pr list --head feat/P03-T07-python-websocket-manager
```

### **Step 3: Merge in Sequence**
For each PR in order:
1. **Verify dependencies** are merged
2. **Convert from draft** (if applicable)
3. **Review and approve**
4. **Merge with squash** to maintain clean history
5. **Verify next PR** can proceed

### **Step 4: Handle Missing PRs**
Some branches may not have PRs yet:
```bash
# Create PR for existing branch
gh pr create --title "feat: description" --body "content" --base dev --head branch-name
```

## ⚠️ **Critical Rules**

1. **Never merge out of order** - this will break the development timeline
2. **Use squash merge** - keeps history clean
3. **Keep branches** - don't delete after merge for historical reference
4. **Draft PRs** - use drafts to prevent accidental early merging
5. **Verify dependencies** - always check that prerequisites are merged first

## 🚨 **If Order Is Broken**

If PRs are merged out of order:
1. **Stop immediately**
2. **Document the issue**
3. **Consider branch reset** or **revert commits**
4. **Restart merge sequence** from the correct point

## 📊 **Progress Tracking**

Use this checklist to track progress:
- [ ] Phase 1 Complete (Tasks 1-3)
- [ ] Phase 2 Complete (Tasks 4-6)  
- [ ] Phase 3 Complete (Tasks 7-11)
- [ ] Phase 4 Complete (Tasks 12-14)
- [ ] Phase 5 Complete (Tasks 15-17)
- [ ] Phase 6 Complete (Tasks 18-21)

**Current Status**: Phase 1, Task 1 complete ✅