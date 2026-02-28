# DevNet StudyLab -- Content Strategy

> **Last updated:** 2026-02-27
> **Version:** 1.0.0

---

## Table of Contents

1. [Content Overview](#content-overview)
2. [Content Sources](#content-sources)
3. [Question Generation Methodology](#question-generation-methodology)
4. [Validation Pipeline](#validation-pipeline)
5. [Content Schemas](#content-schemas)
6. [Bloom's Taxonomy Mapping](#blooms-taxonomy-mapping)
7. [Coverage Matrix](#coverage-matrix)
8. [Update and Maintenance Process](#update-and-maintenance-process)

---

## Content Overview

DevNet StudyLab content is organized around three primary content types that reinforce learning through different modalities:

| Content Type | Purpose | Count Target | Storage |
|-------------|---------|--------------|---------|
| **Flashcards** | Spaced repetition review of key concepts | 10-15 per objective (~600 total) | `flashcards` table |
| **Practice Questions** | Exam-style assessment with multiple question types | 5-10 per objective (~400 total) | `practice_questions` table |
| **Labs** | Hands-on coding exercises with auto-grading | 1-2 per objective (~60 total) | `labs` table + exercise files |

All content is mapped to the 61 exam objectives across 6 domains, ensuring complete coverage of the 200-901 exam blueprint.

---

## Content Sources

Content is derived from authoritative sources only. No proprietary exam questions or brain dumps are used.

### Primary Sources

| Source | Type | Usage |
|--------|------|-------|
| **Cisco DevNet Associate Exam Blueprint (200-901 v1.1)** | Official | Defines all 61 objectives and domain weights |
| **Cisco DevNet Documentation** | Official | API references, platform guides, SDK docs |
| **Cisco Learning Network** | Official | Study materials and community resources |
| **RFC Documents** | Standard | HTTP (RFC 7230-7235), REST constraints, JSON (RFC 8259) |
| **Python Official Documentation** | Standard | Language reference, standard library, PEPs |
| **Docker Official Documentation** | Standard | Dockerfile reference, CLI reference, best practices |
| **Ansible Official Documentation** | Standard | Module reference, playbook syntax, best practices |
| **IETF YANG RFCs** | Standard | RFC 6020 (YANG), RFC 6241 (NETCONF), RFC 8040 (RESTCONF) |
| **OWASP Foundation** | Standard | Top 10 security risks, testing guide |

### Secondary Sources

| Source | Type | Usage |
|--------|------|-------|
| **Cisco DevNet Sandbox** | Practice | Real API response formats and behavior patterns |
| **OpenAPI/Swagger specifications** | Reference | Meraki, Catalyst Center, Webex API schemas |
| **Cisco Press publications** | Educational | Concept explanations and examples |
| **Python PEP documents** | Standard | Coding standards, best practices (PEP 8, PEP 20) |

### Prohibited Sources

- Actual exam questions or "brain dumps"
- Copyrighted course material (without license)
- AI-generated content without fact-checking
- Outdated documentation (pre-2024 for API references)

---

## Question Generation Methodology

### Process

1. **Objective Analysis:** Parse each exam objective to identify the knowledge and skills required
2. **Concept Extraction:** Break objectives into atomic concepts (facts, procedures, comparisons)
3. **Question Drafting:** Create questions targeting each concept using appropriate Bloom's levels
4. **Distractor Design:** Craft plausible but incorrect answers based on common misconceptions
5. **Explanation Writing:** Write detailed explanations referencing source material
6. **Difficulty Calibration:** Assign difficulty based on Bloom's level and concept complexity
7. **Peer Review:** Technical review for accuracy and clarity
8. **Tagging:** Apply domain, objective, and topic tags

### Question Types

| Type | Database Enum | Format | Use Case |
|------|--------------|--------|----------|
| **Multiple Choice** | `multiple_choice` | Single correct answer from 4 options | Factual recall, concept identification |
| **Multiple Select** | `multiple_select` | 2-3 correct answers from 5-6 options | Comprehensive understanding |
| **Drag & Drop** | `drag_drop` | Match or order items | Sequence understanding, categorization |
| **Fill in the Blank** | `fill_blank` | Type the correct value | Exact recall (ports, commands, syntax) |

### Distractor Guidelines

- Each distractor must be plausible to someone who partially understands the topic
- Distractors should represent common misconceptions, not random wrong answers
- Avoid "all of the above" and "none of the above" options
- Distractors should be similar in length and structure to the correct answer
- Never use trick questions or intentionally misleading wording

---

## Validation Pipeline

Content passes through a four-stage validation pipeline before being marked as production-ready.

### Stage 1: Schema Validation

Automated validation that every content item conforms to its JSON schema.

**Checks:**
- All required fields are present and non-empty
- Field types match the schema (string, array, enum values)
- Difficulty enum is one of: `easy`, `medium`, `hard`
- Question type enum is one of: `multiple_choice`, `multiple_select`, `drag_drop`, `fill_blank`
- `correct_answer` format matches the question type
- `options` array length is 4 (MC) or 5-6 (MS) when applicable
- `source_url` is a valid URL when provided
- `tags` is an array of non-empty strings

### Stage 2: Fact-Checking

Manual and semi-automated verification of technical accuracy.

**Checks:**
- Correct answers are verified against official documentation
- API endpoint paths match current Cisco API versions
- Code examples execute without errors
- Port numbers, protocol names, and version numbers are current
- Platform names use current branding (e.g., "Catalyst Center" not "DNA Center")

### Stage 3: Coverage Audit

Ensures complete coverage of the exam blueprint.

**Checks:**
- Every objective has at least 5 practice questions
- Every objective has at least 10 flashcards
- Difficulty distribution is balanced (30% easy, 50% medium, 20% hard)
- Question type distribution includes at least 2 types per objective
- No domain has fewer than its weighted proportion of total questions

### Stage 4: Duplicate Detection

Prevents redundant content.

**Checks:**
- No two flashcards have the same question text (fuzzy matching)
- No two practice questions test the identical concept at the same difficulty
- Questions that seem similar are flagged for manual review
- Cross-domain questions are intentionally mapped to the primary objective

---

## Content Schemas

### Flashcard Schema

```typescript
interface Flashcard {
  id: string;              // UUID, auto-generated
  objectiveId: number;     // FK to objectives table
  question: string;        // Front of card (plain text or markdown)
  answer: string;          // Back of card (plain text or markdown)
  explanation?: string;    // Extended explanation with context
  sourceUrl?: string;      // Reference URL for fact-checking
  difficulty: "easy" | "medium" | "hard";
  tags?: string[];         // Topic tags for filtering
}
```

**Example:**
```json
{
  "objectiveId": 15,
  "question": "What are the three planes of a network device?",
  "answer": "1) Management Plane: Handles device configuration and monitoring (SSH, SNMP, NETCONF). 2) Control Plane: Makes forwarding decisions, runs routing protocols (OSPF, BGP). 3) Data Plane: Actually forwards packets based on control plane decisions.",
  "explanation": "Understanding the three planes is critical for programmability. The management plane is where automation tools like Ansible and NETCONF interact with devices. The control plane can be centralized (SDN controllers like Catalyst Center). The data plane handles actual packet forwarding.",
  "sourceUrl": "https://developer.cisco.com/docs/",
  "difficulty": "medium",
  "tags": ["network-planes", "sdn", "programmability"]
}
```

### Practice Question Schema

```typescript
interface PracticeQuestion {
  id: string;              // UUID, auto-generated
  objectiveId: number;     // FK to objectives table
  type: "multiple_choice" | "multiple_select" | "drag_drop" | "fill_blank";
  question: string;        // Question text (markdown supported)
  options?: JsonValue;     // Answer options (varies by type)
  correctAnswer: JsonValue; // Correct answer(s)
  explanation?: string;    // Why the answer is correct
  sourceUrl?: string;      // Reference URL
  difficulty: "easy" | "medium" | "hard";
  tags?: string[];         // Topic tags
}
```

**Multiple Choice Example:**
```json
{
  "objectiveId": 8,
  "type": "multiple_choice",
  "question": "Which HTTP method is used to create a new resource in a REST API?",
  "options": [
    { "key": "A", "text": "GET" },
    { "key": "B", "text": "POST" },
    { "key": "C", "text": "PUT" },
    { "key": "D", "text": "PATCH" }
  ],
  "correctAnswer": "B",
  "explanation": "POST is the standard HTTP method for creating new resources. GET retrieves resources, PUT replaces an entire resource, and PATCH partially updates a resource.",
  "difficulty": "easy",
  "tags": ["http-methods", "rest-api"]
}
```

**Multiple Select Example:**
```json
{
  "objectiveId": 10,
  "type": "multiple_select",
  "question": "Which of the following are valid API authentication mechanisms? (Choose 3)",
  "options": [
    { "key": "A", "text": "HTTP Basic Authentication" },
    { "key": "B", "text": "API Key in header" },
    { "key": "C", "text": "MAC address filtering" },
    { "key": "D", "text": "OAuth 2.0 Bearer Token" },
    { "key": "E", "text": "VLAN tagging" }
  ],
  "correctAnswer": ["A", "B", "D"],
  "explanation": "Basic Auth, API keys, and OAuth 2.0 are all valid API authentication mechanisms. MAC address filtering and VLAN tagging are network-level controls, not API authentication methods.",
  "difficulty": "medium",
  "tags": ["api-auth", "security"]
}
```

**Fill in the Blank Example:**
```json
{
  "objectiveId": 42,
  "type": "fill_blank",
  "question": "The default port number for SSH is ____.",
  "options": null,
  "correctAnswer": "22",
  "explanation": "SSH (Secure Shell) uses TCP port 22 by default. Other common ports: HTTP (80), HTTPS (443), Telnet (23), NETCONF (830).",
  "difficulty": "easy",
  "tags": ["ports", "ssh", "network-fundamentals"]
}
```

---

## Bloom's Taxonomy Mapping

Questions are designed to target specific cognitive levels from Bloom's Taxonomy, mapped to difficulty:

### Level Mapping

| Bloom's Level | Difficulty | Question Approach | Example Verbs |
|--------------|-----------|-------------------|---------------|
| **Remember** | Easy | Direct recall of facts, definitions, ports | Define, list, identify, name |
| **Understand** | Easy-Medium | Explain concepts, compare approaches | Describe, explain, compare, distinguish |
| **Apply** | Medium | Use knowledge in a new scenario | Implement, construct, demonstrate, use |
| **Analyze** | Medium-Hard | Break down problems, troubleshoot | Analyze, troubleshoot, differentiate, examine |
| **Evaluate** | Hard | Judge best approach, assess tradeoffs | Evaluate, justify, recommend, assess |
| **Create** | Hard (Labs) | Design solutions, write code | Design, construct, build, develop |

### Distribution Target

| Bloom's Level | Flashcard % | Question % | Lab % |
|--------------|-------------|------------|-------|
| Remember | 40% | 15% | 0% |
| Understand | 35% | 25% | 10% |
| Apply | 15% | 30% | 40% |
| Analyze | 8% | 20% | 25% |
| Evaluate | 2% | 8% | 15% |
| Create | 0% | 2% | 10% |

---

## Coverage Matrix

### Domain Coverage Requirements

| Domain | Weight | Questions (min) | Flashcards (min) | Labs (min) |
|--------|--------|-----------------|-------------------|------------|
| 1. Software Development & Design | 15% | 40 | 80 | 4 |
| 2. Understanding & Using APIs | 20% | 60 | 120 | 6 |
| 3. Cisco Platforms & Development | 15% | 40 | 80 | 5 |
| 4. Application Deployment & Security | 15% | 40 | 80 | 5 |
| 5. Infrastructure & Automation | 20% | 60 | 120 | 6 |
| 6. Network Fundamentals | 15% | 40 | 80 | 4 |
| **Total** | **100%** | **280+** | **560+** | **30+** |

### Objective-Level Coverage

Each of the 61 objectives should have:

| Content Type | Minimum | Target | Maximum |
|-------------|---------|--------|---------|
| Flashcards | 5 | 10-15 | 20 |
| Practice Questions | 3 | 5-10 | 15 |
| Labs | 0 | 1-2 | 3 |

### Current Coverage Status (as of initial launch)

| Domain | Objectives | Flashcards | Questions | Labs |
|--------|-----------|------------|-----------|------|
| 1. Software Dev | 8 | 30 | -- | 2 (python-data-parsing, git-basics) |
| 2. APIs | 9 | 33 | -- | 1 (rest-api-client) |
| 3. Cisco Platforms | 9 | 33 | -- | 1 (netconf-basics) |
| 4. Deployment | 12 | 36 | -- | 1 (docker-basics) |
| 5. Infrastructure | 14 | 36 | -- | 2 (ansible-network, bash-scripting) |
| 6. Networking | 9 | 31 | -- | 0 |

**Note:** The 199 flashcards cover all 61 objectives with 3-5 cards per objective. Full content population to meet per-objective targets (10-15 per objective) is part of the content development roadmap.

---

## Update and Maintenance Process

### Content Lifecycle

```
Draft --> Schema Validated --> Fact-Checked --> Coverage Audited --> Published
  ^                                                                    |
  |                                                                    v
  +------------------------- Review Cycle <------- Flagged for Update
```

### Triggers for Content Updates

| Trigger | Action | Priority |
|---------|--------|----------|
| Cisco exam blueprint update | Add/remove/modify objectives and all related content | Critical |
| Cisco platform API version change | Update API endpoints, response formats, and code examples | High |
| Software version update (IOS-XE, etc.) | Verify version numbers, commands, and features | Medium |
| Student feedback / error reports | Correct inaccuracies, improve explanations | Medium |
| New Cisco platform or feature | Add content for new exam-relevant topics | Low |
| Quarterly review cycle | Audit all content for accuracy and freshness | Routine |

### Content Review Schedule

| Frequency | Activity |
|-----------|----------|
| **Weekly** | Review flagged content issues and student reports |
| **Monthly** | Check for Cisco API/platform documentation updates |
| **Quarterly** | Full coverage audit and difficulty rebalancing |
| **Annually** | Complete blueprint alignment review |
| **On-demand** | Cisco exam blueprint revision triggers full content review |

### Version Control

- All content changes are tracked in the database with timestamps
- Content JSON files (when used for bulk import) are version-controlled in Git
- The `source_url` field on each content item traces back to the authoritative source
- Content validation scripts (`scripts/validate-docs.ts`) run in CI to detect gaps

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Objective coverage | 100% of objectives | Validation script |
| Difficulty balance | 30/50/20 easy/medium/hard | Database query |
| Source URL presence | > 80% of items | Database query |
| Explanation coverage | 100% of questions | Schema validation |
| Student pass rate | > 70% on first attempt | Practice attempt analytics |
| Flashcard mastery rate | > 60% within 30 days | Flashcard progress analytics |
