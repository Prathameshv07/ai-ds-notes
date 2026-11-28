---
id: data-collection-practical
title: Collecting Business Datasets
subject: data-analysis
level: foundation
type: practical
practical: 1
syllabus: [UDSVI-006]
unit: 1
prerequisites: [business-analytics]
related: [exploratory-data-analysis-practical, types-of-variables]
time: 45 min
status: reviewed
sources:
  - "pandas documentation: pandas.read_csv, https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html"
  - "Google Docs Editors Help: View & manage form responses, https://support.google.com/docs/answer/139706"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To collect business datasets from real-life scenarios: **secondary data** from a company's own sales records, and **primary data** from a customer survey, and to load both into Python for analysis.

## Concepts used

- [[business-analytics]]: why a business collects data at all.
- [[types-of-variables]]: each survey question produces a categorical or numerical variable.
- [[exploratory-data-analysis]]: the next step after collecting data.

## Before the lab

- **Open:** a Google account signed in; the Colab link below opens in your browser. Nothing to install.
- **Revise:** [[business-analytics]] Q1 (why businesses collect data) and what a CSV file is: a plain-text table, one row per line, values separated by commas.
- **Prepare your survey (for Steps 8–10):** make a Google Form with 4–5 questions, at least one with numbers (e.g. monthly spend) and one with choices (e.g. how often you shop). Collect at least 10 responses from classmates before the lab.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/data-analysis/data-collection-practical.ipynb). Nothing to install: Colab already has pandas.

- **Dataset:** Sahyadri Mart daily sales, 12 Maharashtra stores, 2024–2025 (synthetic; see its data card in `content/assets/data/`). The code loads it directly from GitHub.
- **Your own survey (in class):** create a Google Form with 4–5 questions → *Responses* tab → *More* (⋮) → *Download responses (.csv)*. In Colab, run `from google.colab import files; files.upload()`, choose the file, and read it with `pd.read_csv("<file name>.csv", thousands=",")`.
- The outputs below come from pandas 3. On pandas 2.x (current Colab), text columns show the type `object` instead of `str`; everything else is the same.

## Steps

1. **Open the notebook.** Click *Open in Colab*, then *File → Save a copy in Drive*, so your changes are kept. *You should see:* a notebook titled "Data Collection Practical" with 5 code cells.
2. **Run Step 1** (click the cell, press Shift+Enter). *You should see:* `Rows, columns: (8772, 16)`, the period 2024-01-01 to 2025-12-31, `Stores: 12`, and 3 rows of sales.
3. **Run Step 2.** *You should see:* `(6, 5)` and the column types; *Monthly spend (Rs)* is `float64`, a number.
4. **Run Step 3.** *You should see:* the survey table with short column names and the timestamp as a date-time.
5. **Run Step 4.** *You should see:* `monthly_spend` with 1 missing value; S04 Pune 4 responses, S05 Pune 2.
6. **Run Step 5.** *You should see:* `(6, 5) rows and columns saved`, and `customer_survey.csv` in the Files panel (folder icon on the left).
7. **Read the Explanation** below and note which data is primary and which is secondary.
8. **Download your own survey.** In your form: *Responses → More (⋮) → Download responses (.csv)*. *You should see:* a ZIP file in your Downloads folder, with the CSV inside.
9. **Upload it to Colab.** In a new cell, run `from google.colab import files; files.upload()` and choose the ZIP (or the extracted CSV). *You should see:* the file name and size printed under the cell.
10. **Load it.** Run `my = pd.read_csv("<file name>", thousands=",")` and then `my.shape` and `my.isna().sum()`. *You should see:* one row per response and the count of missing answers in each column. pandas opens a ZIP holding one CSV directly.

## Code

### Step 1. Secondary data: the company's sales records

```python
# Step 1. Secondary data: the store chain's own daily sales records
import pandas as pd

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
sales = pd.read_csv(url, parse_dates=["date"])

print("Rows, columns:", sales.shape)
print("Period:", sales["date"].min().date(), "to", sales["date"].max().date())
print("Stores:", sales["store_id"].nunique())
print(sales[["date", "store_id", "city", "footfall", "revenue_inr"]].head(3))
```

### Step 2. Primary data: a customer survey export

```python
# Step 2. Primary data: customer survey responses exported from Google Forms as CSV.
# In class, use your own form's CSV: files.upload() in Colab, then pd.read_csv("your_file.csv").
# Here, a sample export is written inline so the code runs anywhere.
from io import StringIO

survey_csv = """Timestamp,Which store do you visit?,How often do you shop?,Rate our service (1-5),Monthly spend (Rs)
20/11/2026 10:02:11,S04 Pune,Weekly,4,"3,200"
20/11/2026 10:05:40,S05 Pune,Daily,5,"6,500"
20/11/2026 10:09:03,S04 Pune,Monthly,3,"1,200"
20/11/2026 10:15:27,S05 Pune,Weekly,4,"2,800"
20/11/2026 10:21:55,S04 Pune,Weekly,2,"2,500"
20/11/2026 10:30:18,S04 Pune,Fortnightly,5,
"""
survey = pd.read_csv(StringIO(survey_csv), thousands=",")
print(survey.shape)
print(survey.dtypes)
```

### Step 3. Tidy the column names and types

```python
# Step 3. Tidy the column names so they are easy to type in code
survey.columns = ["timestamp", "store", "frequency", "rating", "monthly_spend"]
survey["timestamp"] = pd.to_datetime(survey["timestamp"], format="%d/%m/%Y %H:%M:%S")
print(survey)
```

### Step 4. First quality check

```python
# Step 4. First quality check of the collected data
print("Missing values per column:")
print(survey.isna().sum())
print("\nResponses per store:")
print(survey["store"].value_counts())
```

### Step 5. Save the collected data

```python
# Step 5. Save the collected survey data for later analysis
survey.to_csv("customer_survey.csv", index=False)
print(pd.read_csv("customer_survey.csv").shape, "rows and columns saved")
```

## Output

### Step 1

```output
Rows, columns: (8772, 16)
Period: 2024-01-01 to 2025-12-31
Stores: 12
        date store_id    city  footfall  revenue_inr
0 2024-01-01      S01  Mumbai      1615       763590
1 2024-01-02      S01  Mumbai      1601       807240
2 2024-01-03      S01  Mumbai      1669       846930
```

### Step 2

```output
(6, 5)
Timestamp                        str
Which store do you visit?        str
How often do you shop?           str
Rate our service (1-5)         int64
Monthly spend (Rs)           float64
dtype: object
```

### Step 3

```output
            timestamp     store    frequency  rating  monthly_spend
0 2026-11-20 10:02:11  S04 Pune       Weekly       4         3200.0
1 2026-11-20 10:05:40  S05 Pune        Daily       5         6500.0
2 2026-11-20 10:09:03  S04 Pune      Monthly       3         1200.0
3 2026-11-20 10:15:27  S05 Pune       Weekly       4         2800.0
4 2026-11-20 10:21:55  S04 Pune       Weekly       2         2500.0
5 2026-11-20 10:30:18  S04 Pune  Fortnightly       5            NaN
```

### Step 4

```output
Missing values per column:
timestamp        0
store            0
frequency        0
rating           0
monthly_spend    1
dtype: int64

Responses per store:
store
S04 Pune    4
S05 Pune    2
Name: count, dtype: int64
```

### Step 5

```output
(6, 5) rows and columns saved
```

## Explanation

### What kinds of data did we collect?

==Primary data is collected first-hand for the current purpose; secondary data already exists, collected earlier or by someone else.==

| | Primary | Secondary |
|---|---|---|
| Example here | Customer survey (Step 2) | Sales records from the billing system (Step 1) |
| Cost and time | High | Low |
| Fits the question? | Exactly, you designed it | Partly, it was collected for another reason |
| Typical sources | ==Surveys, interviews, observation, experiments== | ==Company records, government data== (data.gov.in), ==Kaggle, reports, APIs== |

Data can also be ==**internal** (from inside the company==, like the sales records) or ==**external** (from outside==, like census or weather data).

### What does each step show?

- **Step 1:** one `read_csv` call loads two years of records: 8,772 rows = 12 stores × 731 days. Always check the shape, the date range and the number of stores first: they tell you whether you received what you expected.
- **Step 2:** the survey questions become columns. `thousands=","` turns "3,200" into the number 3200; without it, monthly spend would be read as text.
- **Step 3:** long question texts are renamed to short, code-friendly names, and the timestamp text is converted into a real date-time.
- **Step 4:** one customer skipped the spend question, so `monthly_spend` has one missing value (`NaN`). Also, the survey has 4 responses from S04 and only 2 from S05: too few, and unbalanced, to compare the stores yet.
- **Step 5:** the cleaned data is saved, so later practicals can load it without repeating these steps.

### What makes collected data good?

==Good data is **relevant** to the question, **accurate**, **complete**, **timely**, and **representative**== of the people or events it describes. ==Plan what to ask, whom to ask and how many before collecting.== A survey filled in only by happy weekend customers cannot describe all customers.

## Common errors and fixes

| What you see | Why | Fix |
|---|---|---|
| `FileNotFoundError: [Errno 2] No such file or directory: 'your_file.csv'` | The file was not uploaded, or the name is spelt differently | Run `files.upload()` again; copy the exact name from the Files panel |
| `HTTPError: HTTP Error 404: Not Found` | A typo in the dataset URL | Copy the URL again from the data card or Step 1 |
| `TypeError` when you take `.mean()` of monthly spend (the wording differs between pandas versions) | Without `thousands=","`, "3,200" is read as text | Add `thousands=","` to `read_csv` |
| `ValueError: Length mismatch: Expected axis has 6 elements, new values have 5 elements` | The list of new column names has a different length from the columns | Give exactly one new name per column; check with `survey.columns` |
| `ValueError: time data "20/11/2026 10:02:11" doesn't match format ...` | The date format string does not match the file, e.g. month and day swapped | Use `%d/%m/%Y %H:%M:%S` for day/month/year; check one value first |
| The downloaded file is a `.zip`, not a `.csv` | Google Forms packs responses into a ZIP | Upload the ZIP and read it directly, or extract the CSV first |
| `str` where your teacher's screen shows `object` | Different pandas versions name text columns differently | Nothing to fix; both mean text |

## Try it

Add a sixth question to the survey: "Did you use a discount coupon? (Yes/No)". Add the answers Yes, No, Yes, Yes, No, No to the six rows of `survey_csv`, rerun Steps 2–4, and answer: what data type does pandas give the new column, and what percentage of customers used a coupon?

> [!answer]- Answer
> The new column is text (`str` on pandas 3, `object` on pandas 2.x), because the answers are words: a categorical variable. `survey["coupon"].value_counts(normalize=True)` gives Yes 0.5 and No 0.5, so 50% of customers used a coupon. (Rename the column to `coupon` in Step 3 by adding it to the list of names.)

## Viva questions

1. What is the difference between primary and secondary data? Give one business example of each.
2. Name four sources of secondary data an Indian retail company could use.
3. Why did we pass `thousands=","` to `read_csv`? What would happen without it?
4. What does `NaN` mean in a pandas DataFrame, and how did we count such values?
5. Why should you check the shape and date range of a dataset right after loading it?
6. Give two reasons why a survey's results might not represent all customers.
7. What is the difference between internal and external data?

## Flashcards

What is primary data? :: Data collected first-hand for the current purpose, e.g. a survey
What is secondary data? :: Data that already exists, collected earlier or by someone else, e.g. company records
Give two sources of secondary data. :: Any two of: company records, data.gov.in, Kaggle, published reports, APIs
Which pandas function reads a CSV file? :: pd.read_csv()
Which read_csv option turns "3,200" into 3200? :: thousands=","
How do you count missing values in each column? :: df.isna().sum()
What does df.shape return? :: A tuple (number of rows, number of columns)
How do you export a Google Form's responses as CSV? :: Responses tab → More (⋮) → Download responses (.csv)

## Sources

- pandas documentation: [pandas.read_csv](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html)
- Google Docs Editors Help: [View & manage form responses](https://support.google.com/docs/answer/139706)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
