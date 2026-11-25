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
status: draft
sources:
  - "pandas documentation: pandas.read_csv, https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html"
  - "Google Forms Help: View and export responses (verify)"
  - "S. C. Albright & W. L. Winston, Business Analytics: Data Analysis and Decision Making, Cengage, Ch. 1–2 (verify)"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To collect business datasets from real-life scenarios: **secondary data** from a company's own sales records, and **primary data** from a customer survey, and to load both into Python for analysis.

## Concepts used

- [[business-analytics]]: why a business collects data at all.
- [[types-of-variables]]: each survey question produces a categorical or numerical variable.
- [[exploratory-data-analysis]]: the next step after collecting data.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/data-analysis/data-collection-practical.ipynb). Nothing to install: Colab already has pandas.

- **Dataset:** Sahyadri Mart daily sales, 12 Maharashtra stores, 2024–2025 (synthetic; see its data card in `content/assets/data/`). The code loads it directly from GitHub.
- **Your own survey (in class):** create a Google Form with 4–5 questions → *Responses* tab → *Link to Sheets* → in the sheet, *File → Download → Comma-separated values (.csv)*. In Colab, run `from google.colab import files; files.upload()`, choose the file, and read it with `pd.read_csv("<file name>.csv", thousands=",")`.
- The outputs below come from pandas 3. On pandas 2.x (current Colab), text columns show the type `object` instead of `str`; everything else is the same.

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
How do you export a Google Form's responses as CSV? :: Responses → Link to Sheets → File → Download → CSV

## Sources

- pandas documentation: [pandas.read_csv](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html)
- Google Forms Help: View and export responses (verify)
- S. C. Albright & W. L. Winston, *Business Analytics: Data Analysis and Decision Making*, Cengage, Ch. 1–2 (verify)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
