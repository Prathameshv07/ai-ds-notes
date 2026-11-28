---
id: exploratory-data-analysis-practical
title: Exploratory Data Analysis on Sales Data
subject: data-analysis
level: foundation
type: practical
practical: 2
syllabus: [UDSVI-006]
unit: 1
prerequisites: [exploratory-data-analysis, data-collection-practical]
related: [central-tendency, dispersion, quartiles-and-percentiles, correlation, correlation-practical]
tags: [interview]
time: 60 min
status: reviewed
sources:
  - "pandas documentation: User Guide, Group by: split-apply-combine, https://pandas.pydata.org/docs/user_guide/groupby.html"
  - "NIST/SEMATECH e-Handbook of Statistical Methods, Ch. 1: Exploratory Data Analysis"
  - "Wes McKinney, Python for Data Analysis, 3rd ed., O'Reilly, 2022, Ch. 10"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To conduct exploratory data analysis (EDA) on a business dataset, two years of daily sales from a 12-store Maharashtra chain, and to identify its trends, patterns, relationships and outliers.

## Concepts used

- [[exploratory-data-analysis]]: the six steps followed here.
- [[central-tendency]] and [[dispersion]]: mean, median, standard deviation.
- [[quartiles-and-percentiles]]: the IQR rule for outliers in Step 10.
- [[correlation]]: the relationships in Step 8.

## Before the lab

- **Open:** a Google account signed in; the Colab link below. Nothing to install.
- **Revise:** [[exploratory-data-analysis]] Q3 (the six steps) and Q6 (outliers), and mean vs median from [[central-tendency]].
- **Read:** the dataset's data card (`content/assets/data/sahyadri-mart-sales.md`), so you know what one row and each column mean.
- **Done first:** [[data-collection-practical]], which uses the same `read_csv` call.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/data-analysis/exploratory-data-analysis-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
- The outputs below come from pandas 3. On pandas 2.x (current Colab), text columns show `object` instead of `str` and dates show `datetime64[ns]`; all numbers are the same.

## Steps

1. **Open the notebook.** Click *Open in Colab*, then *File → Save a copy in Drive*. *You should see:* 10 code cells, one per step.
2. **Run Step 1 (structure).** *You should see:* `Rows, columns: (8772, 16)` and a type for each column; `date` is a date type.
3. **Run Step 2 (quality).** *You should see:* only `rainfall_mm` missing (93), at S03 and S10; 0 duplicate rows and 0 duplicate store-days.
4. **Run Step 3 (categories).** *You should see:* Express 7, Supermarket 5, and the five regions.
5. **Run Step 4 (numbers).** *You should see:* the summary table; revenue mean about ₹444 thousand against a median of about ₹326 thousand.
6. **Run Step 5 (groups).** *You should see:* Supermarkets with about twice the footfall and about ₹683 average bill against ₹369.
7. **Run Step 6 (trend).** *You should see:* a month-by-year table with October highest in both years, and yearly totals of ₹188.5 and ₹201.0 crore.
8. **Run Step 7 (week).** *You should see:* Sunday highest (1,499) and Tuesday lowest (1,130).
9. **Run Step 8 (relationships).** *You should see:* footfall–revenue 0.96, ad spend–revenue 0.61, and the within-store median r of 0.27.
10. **Run Step 9 (festivals and rain).** *You should see:* 3,084 visitors on festival days against 2,169; monsoon footfall falling from dry to heavy rain.
11. **Run Step 10 (outliers).** *You should see:* 25 outlier days, all high, 15 of them festival days.
12. **Write your findings.** In a text cell, list five findings in your own words, then compare them with the Summary of findings below.

## Code

### Step 1. Load the data and understand its structure

```python
# Step 1. Load the data and understand its structure
import pandas as pd

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
df = pd.read_csv(url, parse_dates=["date"])

print("Rows, columns:", df.shape)
print(df.dtypes.to_string())
```

### Step 2. Check data quality: missing values and duplicate rows

```python
# Step 2. Check data quality: missing values and duplicate rows
missing = df.isna().sum()
print("Columns with missing values:")
print(missing[missing > 0].to_string())
print("Stores with missing rainfall:", sorted(df.loc[df["rainfall_mm"].isna(), "store_id"].unique()))
print("Duplicate rows:", df.duplicated().sum())
print("Duplicate store-days:", df.duplicated(subset=["date", "store_id"]).sum())
```

### Step 3. Univariate analysis: categorical columns (count each store once)

```python
# Step 3. Univariate analysis: categorical columns (count each store once)
stores = df.drop_duplicates("store_id")
print(stores["store_type"].value_counts().to_string())
print()
print(stores["region"].value_counts().to_string())
```

### Step 4. Univariate analysis: numerical columns (revenue shown in Rs thousand)

```python
# Step 4. Univariate analysis: numerical columns (revenue shown in Rs thousand)
df["revenue_k"] = df["revenue_inr"] / 1000          # revenue in Rs thousand
print(df[["footfall", "transactions", "revenue_k"]].describe().round(1).to_string())
print("\nRevenue mean vs median (Rs thousand):",
      round(df["revenue_inr"].mean() / 1000, 1), "vs", round(df["revenue_inr"].median() / 1000, 1))
```

### Step 5. Compare groups: store type

```python
# Step 5. Compare groups: store type
by_type = df.groupby("store_type").agg(
    avg_footfall=("footfall", "mean"),
    avg_revenue_k=("revenue_k", "mean"),
    total_revenue=("revenue_inr", "sum"),
    total_bills=("transactions", "sum"),
)
by_type["avg_bill_inr"] = by_type["total_revenue"] / by_type["total_bills"]
print(by_type[["avg_footfall", "avg_revenue_k", "avg_bill_inr"]].round(0).to_string())
```

### Step 6. Trend: total monthly revenue of the chain (Rs lakh), year by year

```python
# Step 6. Trend: total monthly revenue of the chain (Rs lakh), year by year
monthly = (df.groupby([df["date"].dt.year.rename("year"), df["date"].dt.month.rename("month")])
             ["revenue_inr"].sum() / 1e5).unstack("year")
print(monthly.round(0).to_string())
print("\nYearly total (Rs crore):", (df.groupby(df["date"].dt.year)["revenue_inr"].sum() / 1e7).round(1).to_dict())
```

### Step 7. Weekly pattern: average footfall per store by day of the week

```python
# Step 7. Weekly pattern: average footfall per store by day of the week
order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
print(df.groupby("day_of_week")["footfall"].mean().reindex(order).round(0).to_string())
```

### Step 8. Relationships between numerical columns

```python
# Step 8. Relationships between numerical columns
cols = ["ad_spend_inr", "rainfall_mm", "discount_pct", "footfall", "revenue_inr"]
print(df[cols].corr().round(2).to_string())
# Is ad spend really that strongly linked to revenue? Check inside each store.
within = df.groupby("store_id")[["ad_spend_inr", "revenue_inr"]].corr().xs("revenue_inr", level=1)
print("\nAd spend vs revenue, within each store: median r =",
      round(within["ad_spend_inr"].median(), 2))
```

### Step 9. Effect of festivals and of heavy rain on footfall (Mumbai supermarket, S01)

```python
# Step 9. Effect of festivals and of heavy rain on footfall (Mumbai supermarket, S01)
s01 = df[df["store_id"] == "S01"]
print("Festival vs normal days:")
print(s01.groupby("is_festival")["footfall"].mean().round(0).to_string())
monsoon = s01[s01["date"].dt.month.isin([6, 7, 8, 9])]
rain_band = pd.cut(monsoon["rainfall_mm"], [-0.1, 0, 20, 50, 500],
                   labels=["dry", "light", "moderate", "heavy"])
print("\nMonsoon footfall by rain:")
print(monsoon.groupby(rain_band, observed=True)["footfall"].agg(["count", "mean"]).round(0).to_string())
```

### Step 10. Outliers in one store's daily revenue (1.5 x IQR rule)

```python
# Step 10. Outliers in one store's daily revenue (1.5 x IQR rule)
rev = s01["revenue_inr"]
q1, q3 = rev.quantile([0.25, 0.75])
iqr = q3 - q1
low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
out = s01[(rev < low) | (rev > high)]
print(f"Q1 = {q1:,.0f}  Q3 = {q3:,.0f}  IQR = {iqr:,.0f}")
print(f"Outlier limits: below {low:,.0f} or above {high:,.0f}")
print("Outlier days:", len(out), "(all high) | festival days among them:", int(out["is_festival"].sum()))
other = out[out["is_festival"] == 0]
print("Non-festival outliers by month:", other["date"].dt.month.value_counts().sort_index().to_dict())
print("Non-festival outliers by weekday:", other["day_of_week"].value_counts().to_dict())
print("\nTop 3 days:")
print(out.nlargest(3, "revenue_inr")[["date", "is_festival", "revenue_inr"]].to_string(index=False))
```

## Output

### Step 1

```output
Rows, columns: (8772, 16)
date               datetime64[us]
day_of_week                   str
store_id                      str
city                          str
region                        str
store_type                    str
store_area_sqft             int64
is_festival                 int64
discount_pct                int64
display                     int64
ad_spend_inr                int64
rainfall_mm               float64
footfall                    int64
transactions                int64
units_sold                  int64
revenue_inr                 int64
```

### Step 2

```output
Columns with missing values:
rainfall_mm    93
Stores with missing rainfall: ['S03', 'S10']
Duplicate rows: 0
Duplicate store-days: 0
```

### Step 3

```output
store_type
Express        7
Supermarket    5

region
Mumbai-Konkan          3
Western Maharashtra    3
North Maharashtra      2
Marathwada             2
Vidarbha               2
```

### Step 4

```output
       footfall  transactions  revenue_k
count    8772.0        8772.0     8772.0
mean     1261.5         805.3      444.0
std       577.7         377.3      336.3
min       398.0         251.0       79.0
25%       767.8         490.0      167.4
50%      1175.0         738.0      325.9
75%      1617.0        1028.0      633.4
max      4744.0        3157.0     3004.7

Revenue mean vs median (Rs thousand): 444.0 vs 325.9
```

### Step 5

```output
             avg_footfall  avg_revenue_k  avg_bill_inr
store_type                                            
Express             905.0          213.0         369.0
Supermarket        1761.0          767.0         683.0
```

### Step 6

```output
year     2024    2025
month                
1      1478.0  1572.0
2      1365.0  1418.0
3      1529.0  1754.0
4      1548.0  1586.0
5      1611.0  1730.0
6      1425.0  1552.0
7      1387.0  1490.0
8      1456.0  1655.0
9      1598.0  1611.0
10     1934.0  2068.0
11     1816.0  1869.0
12     1704.0  1796.0

Yearly total (Rs crore): {2024: 188.5, 2025: 201.0}
```

### Step 7

```output
day_of_week
Monday       1143.0
Tuesday      1130.0
Wednesday    1161.0
Thursday     1183.0
Friday       1280.0
Saturday     1438.0
Sunday       1499.0
```

### Step 8

```output
              ad_spend_inr  rainfall_mm  discount_pct  footfall  revenue_inr
ad_spend_inr          1.00         0.00          0.02      0.59         0.61
rainfall_mm           0.00         1.00         -0.01     -0.05        -0.02
discount_pct          0.02        -0.01          1.00      0.14         0.09
footfall              0.59        -0.05          0.14      1.00         0.96
revenue_inr           0.61        -0.02          0.09      0.96         1.00

Ad spend vs revenue, within each store: median r = 0.27
```

### Step 9

```output
Festival vs normal days:
is_festival
0    2169.0
1    3084.0

Monsoon footfall by rain:
             count    mean
rainfall_mm               
dry             69  2217.0
light           93  2018.0
moderate        59  1952.0
heavy           23  1851.0
```

### Step 10

```output
Q1 = 909,030  Q3 = 1,197,120  IQR = 288,090
Outlier limits: below 476,895 or above 1,629,255
Outlier days: 25 (all high) | festival days among them: 15
Non-festival outliers by month: {3: 1, 10: 3, 11: 5, 12: 1}
Non-festival outliers by weekday: {'Sunday': 6, 'Friday': 2, 'Wednesday': 1, 'Saturday': 1}

Top 3 days:
      date  is_festival  revenue_inr
2025-10-21            1      3004710
2024-10-31            1      2214400
2024-09-07            1      2189690
```
## Explanation

The steps follow the EDA order: structure → quality → one variable → groups and time → relationships → outliers.

### Steps 1–3: structure, quality and categories

- **Structure:** 8,772 rows × 16 columns; one row = one store-day (12 stores × 731 days). Dates were parsed as dates, text as text, counts as integers.
- **Quality:** only `rainfall_mm` has gaps (93), all at S03 and S10, so it is a sensor problem at two stores, not random. No duplicate rows and no store-day recorded twice.
- **Categories:** 7 Express and 5 Supermarket stores across five regions. Counting each store once matters: counting rows would count each store 731 times.

### Step 4: what does a typical day look like?

- Revenue mean ₹444 thousand, median ₹326 thousand. ==When the mean is well above the median, a few large values pull it up: a right-skewed distribution.==
- Here the reason is visible in Step 5: two very different kinds of store are mixed in one column, and festival days add a few very large values.
- Footfall is less skewed (mean 1,262, median 1,175).

### Step 5: do the two store types differ?

| | Express | Supermarket |
|---|---|---|
| Average footfall per day | 905 | 1,761 |
| Average revenue per day | ₹213 thousand | ₹767 thousand |
| Average bill | ₹369 | ₹683 |

A Supermarket earns about 3.6 times an Express store a day: about twice the visitors, each spending almost twice as much. ==Summaries of mixed groups can mislead; compare groups separately.==

### Steps 6–7: trends and patterns over time

- **Growth:** total revenue rose from ₹188.5 crore (2024) to ₹201.0 crore (2025), about 6.6%.
- **Season:** October is the peak month in both years (Diwali and Dussehra), followed by November. February is lowest, partly because it has only 28–29 days: compare monthly *totals* with care. July is the weakest 31-day month (monsoon).
- **Week:** Sunday has the most visitors (1,499) and Tuesday the fewest (1,130), about 33% fewer. Staff rosters and deliveries should follow this weekly cycle.

### Step 8: which numbers move together?

- Footfall and revenue: r = 0.96. More visitors, more sales, as expected.
- Ad spend and revenue: r = 0.61 over the whole chain, but only **0.27 inside each store**. Supermarkets both spend more on ads *and* sell more because they are bigger. ==A correlation across mixed groups can be inflated by a third factor; check within groups.==
- Rainfall shows almost no correlation, because most days have no rain at all. Step 9 looks at the monsoon only.

### Step 9: festivals and rain (Mumbai supermarket)

- Festival days: 3,084 visitors against 2,169 on normal days, about 42% more.
- Monsoon days: footfall falls steadily with rain: dry 2,217 → light 2,018 → moderate 1,952 → heavy 1,851 (about 17% below dry days).
- The rain effect was hidden in Step 8's overall correlation and appears once we look at the right subset. EDA often works this way: narrow the question, then look again.

### Step 10: outliers

- 25 days lie above the IQR limit of about ₹16.3 lakh; none lie below.
- 15 of them are festival days; the other 10 are mostly Sundays in October–December, the festive shopping season.
- So these outliers are **genuine**, not errors: keep them, and report festival days separately when describing a normal day.

### Summary of findings

1. Data is complete except rainfall at two stores.
2. Store type is the biggest factor in sales.
3. Sales grow about 6–7% a year, peak in October–November, dip in the monsoon, and peak each weekend.
4. Festivals and weekends raise footfall; heavy rain lowers it.
5. Ad spend matters less than the chain-wide numbers suggest.
6. High outliers are real festival-season days.

Each finding is a hypothesis for later practicals (correlation, regression, forecasting, hypothesis tests) to test properly.

## Common errors and fixes

| What you see | Why | Fix |
|---|---|---|
| `KeyError: 'Revenue'` | Column names are case-sensitive and exact | Use `df.columns` to see the real names, e.g. `revenue_inr` |
| `AttributeError: Can only use .dt accessor with datetimelike values` | The file was read without `parse_dates=["date"]`, so dates are text | Reload with `parse_dates=["date"]`, or run `df["date"] = pd.to_datetime(df["date"])` |
| `ValueError: could not convert string to float: '2024-01-01'` from `df.corr()` | Correlation needs numbers, and the table has text columns | Select numerical columns first, as in Step 8: `df[cols].corr()` |
| A day shows `NaN` in Step 7 | A spelling mistake in the `order` list, e.g. "Wednsday" | Copy the day names exactly; check with `df["day_of_week"].unique()` |
| Store types show Express 5117, Supermarket 3655 | Counted from all rows, so each store is counted 731 times | Count from `df.drop_duplicates("store_id")`, as in Step 3 |
| `HTTPError: HTTP Error 404: Not Found` | A typo in the dataset URL | Copy the URL again from Step 1 or the data card |

## Try it

Repeat Step 9's festival comparison for the Pune Express store, S05. How many more visitors does it get on festival days, in percentage terms? Is the festival effect bigger or smaller than at the Mumbai supermarket?

Start from: `s05 = df[df["store_id"] == "S05"]`

> [!answer]- Answer
> ```python
> s05 = df[df["store_id"] == "S05"]
> print(s05.groupby("is_festival")["footfall"].mean().round(0).to_string())
> ```
> ```output
> is_festival
> 0    1238.0
> 1    1687.0
> ```
> 1,687 ÷ 1,238 ≈ 1.36, so about **36% more** visitors on festival days. That is a little smaller than the 42% at the Mumbai supermarket, but still a large, clear effect.

## Viva questions

1. What are the six steps of EDA, and which step of this practical belongs to each?
2. Why did we count store types from `drop_duplicates("store_id")` and not from all rows?
3. Revenue has mean ₹444 thousand and median ₹326 thousand. What does this tell you, and why did it happen here?
4. Why is comparing monthly totals across months slightly unfair? How could you correct for it?
5. Ad spend and revenue have r = 0.61 for the chain but about 0.27 within stores. Explain the difference.
6. How is the 1.5 × IQR outlier rule applied? Why did we apply it to one store instead of the whole chain?
7. Should the Diwali-day outliers be deleted? Justify your answer.
8. What does `groupby` do in pandas? Give one example from this practical.

## Flashcards

How do you see the number of rows and columns of a DataFrame? :: df.shape
How do you see the data type of each column? :: df.dtypes (or df.info())
How do you count duplicate rows? :: df.duplicated().sum()
Which method gives count, mean, std, min, quartiles and max? :: df.describe()
How do you compare a numerical column across groups? :: df.groupby("group")["column"].mean()
How do you get pairwise correlations of numerical columns? :: df[cols].corr()
What are the IQR outlier limits? :: Q1 − 1.5 × IQR and Q3 + 1.5 × IQR
Why check correlations within groups? :: A third factor (such as store size) can inflate or create a correlation across mixed groups

## Sources

- pandas documentation: [Group by: split-apply-combine](https://pandas.pydata.org/docs/user_guide/groupby.html)
- NIST/SEMATECH *e-Handbook of Statistical Methods*, Ch. 1: Exploratory Data Analysis
- Wes McKinney, *Python for Data Analysis*, 3rd ed., O'Reilly, 2022, Ch. 10: Data Aggregation and Group Operations
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
