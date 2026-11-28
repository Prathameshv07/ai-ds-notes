---
id: er-diagram-practical
title: ER Diagrams for Student and Library Management
subject: databases
level: core
type: practical
practical: 2
syllabus: [UDSII-003]
unit: 4
prerequisites: [er-diagram-development, associative-entities, connectivity-and-cardinality]
related: [er-model, keys, weak-entities]
time: 60 min
status: draft
sources:
  - "Coronel, Morris & Rob, Database Systems: Design, Implementation, and Management, 9th ed., Ch. 4 (4.1–4.2)"
  - "Mermaid documentation: Entity Relationship Diagrams, https://mermaid.js.org/syntax/entityRelationshipDiagram.html"
  - "diagrams.net (draw.io), free diagramming tool, https://www.drawio.com"
---

## Aim

To design ER diagrams for (a) a **student management system** and (b) a **library management system**: identify entities, attributes, primary keys, relationships and cardinalities from business rules, and draw them in crow's foot notation.

## Concepts used

- [[er-diagram-development]]: the six-step method followed here.
- [[connectivity-and-cardinality]]: the symbols at each line end.
- [[associative-entities]]: resolving every M:N relationship.
- [[keys]]: choosing primary keys.

## Before the lab

- **Revise (10 minutes):** [[er-model]] (entities and attributes), [[connectivity-and-cardinality]] (line-end symbols), [[associative-entities]] (resolving M:N) and [[keys]] (primary keys).
- **Open:** [mermaid.live](https://mermaid.live) in any browser. Nothing to install; it works on a phone too, but a laptop is easier for typing.
- **Keep ready:** your practical journal and a pencil, for the hand-drawn version.
- **Know the symbols:** `||` exactly one, `o|` zero or one, `|{` one or many, `o{` zero or many; a solid line `--` is identifying, a dashed line `..` is non-identifying.

## Setup

No Python is needed. Use any one tool:

- **Mermaid** (recommended, text-based): open [mermaid.live](https://mermaid.live), paste the code below, and the diagram appears on the right. The same code also works in Obsidian notes.
- **draw.io** (free, drag-and-drop): open [app.diagrams.net](https://app.diagrams.net), choose *Entity Relation* shapes, and draw the same entities and lines.
- **Paper:** for the journal, draw by hand in Chen or crow's foot notation.

## Steps

1. **Open [mermaid.live](https://mermaid.live).** You should see a code box on the left and a sample diagram on the right.
2. **Clear the code box and type `erDiagram` on the first line.** The sample disappears and the diagram area is empty, with no red error.
3. **Type the first relationship: `DEPARTMENT ||..o{ STUDENT : has`.** Two boxes appear, joined by a dashed line: a double bar at DEPARTMENT and a circle with a crow's foot at STUDENT.
4. **Add the other Part A relationship lines one at a time** (from Code, Part A). Each line adds a box or a connecting line. If a red "Parse error" appears, check Common errors and fixes below before going on.
5. **Add the attribute blocks** (DEPARTMENT { … } and so on). Each box grows to list its attributes, with PK and FK beside the keys.
6. **Check each line end against the business rules,** reading every relationship in both directions. Your diagram should match Output, Part A.
7. **Save your work:** download the diagram as PNG or SVG from the editor's download/export option, or take a screenshot. Paste or print it for the journal.
8. **Repeat steps 2–7 for Part B** (library). Your diagram should match Output, Part B.
9. **Hand-draw both diagrams in the journal** in Chen notation: entities as rectangles, attributes as ovals, relationships as diamonds, with 1 and M written on the lines.

## Code

### Part A. Student management system: business rules

1. A department has many students; each student belongs to one department.
2. A department offers many courses; each course is offered by one department.
3. A faculty member belongs to one department and teaches many courses; each course has one faculty member.
4. A student enrols in many courses, and a course has many students. For each enrolment we store the semester and the marks.

### Part A. Mermaid code

```text
erDiagram
  DEPARTMENT ||..o{ STUDENT : has
  DEPARTMENT ||..o{ COURSE : offers
  DEPARTMENT ||..|{ FACULTY : employs
  FACULTY ||..o{ COURSE : teaches
  STUDENT ||--o{ ENROLMENT : makes
  COURSE ||--o{ ENROLMENT : has
  DEPARTMENT {
    string dept_code PK
    string dept_name
  }
  STUDENT {
    string roll_no PK
    string name
    date dob
    string dept_code FK
  }
  FACULTY {
    string fac_id PK
    string name
    string dept_code FK
  }
  COURSE {
    string course_code PK
    string title
    int credits
    string dept_code FK
    string fac_id FK
  }
  ENROLMENT {
    string roll_no PK, FK
    string course_code PK, FK
    string semester PK
    int marks
  }
```

### Part B. Library management system: business rules

1. A book (title) can have many copies; each copy has a unique accession number.
2. A book can have many authors, and an author can write many books.
3. A publisher publishes many books; each book has one publisher.
4. A member can borrow many copies over time, and a copy is borrowed by many members over time. For each issue we store the issue date, due date and return date.

### Part B. Mermaid code

```text
erDiagram
  PUBLISHER ||..o{ BOOK : publishes
  BOOK ||..|{ BOOK_COPY : "has copies"
  BOOK ||--|{ BOOK_AUTHOR : "written by"
  AUTHOR ||--|{ BOOK_AUTHOR : writes
  MEMBER ||..o{ ISSUE : borrows
  BOOK_COPY ||..o{ ISSUE : "issued in"
  BOOK {
    string isbn PK
    string title
    string pub_id FK
  }
  BOOK_COPY {
    string accession_no PK
    string isbn FK
    string shelf
  }
  AUTHOR {
    string author_id PK
    string name
  }
  BOOK_AUTHOR {
    string isbn PK, FK
    string author_id PK, FK
  }
  PUBLISHER {
    string pub_id PK
    string name
  }
  MEMBER {
    string member_id PK
    string name
    string phone
  }
  ISSUE {
    int issue_id PK
    string member_id FK
    string accession_no FK
    date issue_date
    date due_date
    date return_date
  }
```

## Output

### Part A. Student management ERD

```mermaid
erDiagram
  accTitle: ER diagram for a student management system
  accDescr: A department has many students, offers many courses and employs one or many faculty. A faculty member teaches many courses; each course has one faculty member. Students and courses are linked through ENROLMENT, whose key is roll number, course code and semester, and which stores marks.
  DEPARTMENT ||..o{ STUDENT : has
  DEPARTMENT ||..o{ COURSE : offers
  DEPARTMENT ||..|{ FACULTY : employs
  FACULTY ||..o{ COURSE : teaches
  STUDENT ||--o{ ENROLMENT : makes
  COURSE ||--o{ ENROLMENT : has
  DEPARTMENT {
    string dept_code PK
    string dept_name
  }
  STUDENT {
    string roll_no PK
    string name
    date dob
    string dept_code FK
  }
  FACULTY {
    string fac_id PK
    string name
    string dept_code FK
  }
  COURSE {
    string course_code PK
    string title
    int credits
    string dept_code FK
    string fac_id FK
  }
  ENROLMENT {
    string roll_no PK, FK
    string course_code PK, FK
    string semester PK
    int marks
  }
```

### Part B. Library management ERD

```mermaid
erDiagram
  accTitle: ER diagram for a library management system
  accDescr: A publisher publishes many books. A book has one or many copies. Books and authors are linked through BOOK_AUTHOR. Members and book copies are linked through ISSUE, which has its own issue ID and stores issue, due and return dates.
  PUBLISHER ||..o{ BOOK : publishes
  BOOK ||..|{ BOOK_COPY : "has copies"
  BOOK ||--|{ BOOK_AUTHOR : "written by"
  AUTHOR ||--|{ BOOK_AUTHOR : writes
  MEMBER ||..o{ ISSUE : borrows
  BOOK_COPY ||..o{ ISSUE : "issued in"
  BOOK {
    string isbn PK
    string title
    string pub_id FK
  }
  BOOK_COPY {
    string accession_no PK
    string isbn FK
    string shelf
  }
  AUTHOR {
    string author_id PK
    string name
  }
  BOOK_AUTHOR {
    string isbn PK, FK
    string author_id PK, FK
  }
  PUBLISHER {
    string pub_id PK
    string name
  }
  MEMBER {
    string member_id PK
    string name
    string phone
  }
  ISSUE {
    int issue_id PK
    string member_id FK
    string accession_no FK
    date issue_date
    date due_date
    date return_date
  }
```

## Explanation

**Part A**

- **Entities:** DEPARTMENT, STUDENT, FACULTY and COURSE come straight from the nouns in the rules.
- **1:M relationships:** rules 1–3 each give "one ... many", drawn with `||` on the one side and `o{` (or `|{`) on the many side. A department must employ at least one faculty member, so that end is `|{` (mandatory).
- **M:N resolved:** rule 4 is M:N. ENROLMENT is the associative entity. Marks belong to one student in one course, so they live here.
- **Key of ENROLMENT:** roll no + course code + **semester**, because a student who fails may take the same course again in a later semester.

**Part B**

- **BOOK vs BOOK_COPY:** a title (ISBN) and a physical copy are different things. The library lends copies, so ISSUE links to BOOK_COPY, not BOOK.
- **BOOK_COPY's key:** the accession number is unique across the library, so BOOK_COPY has its own key. It is existence-dependent on BOOK but **not weak**, and the relationship is non-identifying.
- **M:N resolved twice:** BOOK–AUTHOR becomes BOOK_AUTHOR; MEMBER–BOOK_COPY becomes ISSUE.
- **Solid or dashed lines:** only BOOK_AUTHOR (and ENROLMENT in Part A) take their parents' keys into their own primary key, so only their lines are solid (identifying). Every other line is dashed (non-identifying).
- **Surrogate key in ISSUE:** the same member can borrow the same copy again later, so member + copy is not unique. ISSUE uses a surrogate key, issue_id.

## Common errors and fixes

| What you see | Why it happens | Fix |
|---|---|---|
| `Parse error on line 2 … Expecting 'UNICODE_TEXT', 'NUM', 'ENTITY_NAME' … got 'CLASS'` | `CLASS` is a reserved word in Mermaid | Use another name such as `CLASS_SECTION`, or an alias: `CLS["CLASS"]` |
| `Parse error on line 3 … Expecting 'ATTRIBUTE_WORD' … got 'ATTRIBUTE_KEY'` | An attribute line has no data type, such as `roll_no PK` | Write the type first: `string roll_no PK` |
| `Parse error on line 2 … Expecting 'COLON' … got 'NEWLINE'` | A relationship line has no label | Add a colon and a verb: `STUDENT ||--o{ ENROLMENT : makes` |
| No error, but STUDENT and COURSE are joined directly by `}o..o{` | The M:N relationship was not resolved | Add the associative entity ENROLMENT with two 1:M lines |
| No error, but ISSUE's key is member_id + accession_no | The same member can borrow the same copy again, so the key repeats | Use a surrogate key, issue_id |
| No error, but ISSUE is linked to BOOK | The library lends physical copies, not titles | Link ISSUE to BOOK_COPY |

## Try it

Add **fines** to the library: a fine is charged on an issue when the book is returned late; one issue has at most one fine, with an amount and a paid/unpaid status. Which entity holds the fine, and what is the relationship?

> [!answer]- Answer
> Either add `fine_amount` and `fine_paid` as optional attributes of ISSUE, or create FINE (issue_id PK/FK, amount, paid) in a **1:1** relationship with ISSUE, optional on ISSUE's side. A separate FINE entity avoids empty fine columns on the many issues that are returned on time.

## Viva questions

1. What is the difference between an entity and an entity instance? Give an example from your ERD.
2. Why does the library ERD have both BOOK and BOOK_COPY?
3. Why is semester part of ENROLMENT's primary key?
4. Which relationships in your diagrams were M:N, and how did you resolve them?
5. Why does ISSUE use a surrogate key instead of member ID + accession number?
6. Is BOOK_COPY a weak entity? Justify your answer.
7. What do `||`, `o{` and `|{` mean at the end of a line?
8. How would the diagram change if each course could have two faculty members?

## Flashcards

In the library ERD, why does ISSUE link to BOOK_COPY and not BOOK? :: The library lends physical copies, not titles
Why does ENROLMENT's key include semester? :: A student may repeat a course in a later semester
Why does ISSUE use a surrogate key? :: The same member can borrow the same copy more than once
Which associative entity links BOOK and AUTHOR? :: BOOK_AUTHOR

## Sources

- Coronel, Morris & Rob, *Database Systems: Design, Implementation, and Management*, 9th ed., Ch. 4 (4.1–4.2)
- Mermaid documentation: [Entity Relationship Diagrams](https://mermaid.js.org/syntax/entityRelationshipDiagram.html)
- [diagrams.net (draw.io)](https://www.drawio.com), free diagramming tool
