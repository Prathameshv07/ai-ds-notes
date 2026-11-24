---
id: central-tendency-practical
title: Mean, Median and Mode of Sales Data
subject: prob-stats
level: foundation
type: practical
practical: 3
syllabus: [UDSVI-006]
unit: 1
prerequisites: [central-tendency]
related: [exploratory-data-analysis-practical, dispersion-practical]
time: 45 min
status: draft
sources:
  - "pandas documentation: Series.mean, Series.median, Series.mode, https://pandas.pydata.org/docs/reference/series.html"
  - "NumPy documentation: numpy.average, https://numpy.org/doc/stable/reference/generated/numpy.average.html"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To calculate descriptive statistics, the mean, median and mode, for a business dataset, and to decide which of them describes a typical value best.

## Concepts used

- [[central-tendency]]: mean, median, mode and weighted mean, and when to use each.
- [[exploratory-data-analysis-practical]]: the same dataset explored first.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/central-tendency-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day; 12 stores × 731 days.
- The outputs below come from pandas 3. On pandas 2.x (current Colab) all numbers are the same.

## Code

### Step 1. Load the data

```python
# Step 1. Load the data
import pandas as pd
import numpy as np

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
df = pd.read_csv(url, parse_dates=["date"])
print("Rows, columns:", df.shape)
print(df[["date", "store_id", "store_type", "footfall", "revenue_inr"]].head(3).to_string(index=False))
```

### Step 2. Mean and median of daily revenue for the whole chain

```python
# Step 2. Mean and median of daily revenue for the whole chain
rev = df["revenue_inr"]
print(f"Mean revenue   : Rs {rev.mean():,.0f}")
print(f"Median revenue : Rs {rev.median():,.0f}")
print(f"Mean - median  : Rs {rev.mean() - rev.median():,.0f}")
```

### Step 3. Mode: for discrete and categorical columns

```python
# Step 3. Mode: useful for discrete and categorical columns, not for revenue
print("Revenue: distinct values =", rev.nunique(), "out of", len(rev), "rows")
print("Most repeated revenue value appears", rev.value_counts().iloc[0], "times")
print("\nMode of discount_pct:", df["discount_pct"].mode().tolist())
print(df["discount_pct"].value_counts().sort_index().to_string())
top = df.nlargest(500, "footfall")                 # the 500 busiest store-days
print("\nMost common weekday among the 500 busiest days:", top["day_of_week"].mode().tolist())
```

### Step 4. Mean and median by store type

```python
# Step 4. Mean and median by store type
print(df.groupby("store_type")["revenue_inr"].agg(["mean", "median"]).round(0).to_string())
```

### Step 5. Effect of extreme days on the mean and the median

```python
# Step 5. Extreme days move the mean much more than the median (Mumbai supermarket, S01)
s01 = df[df["store_id"] == "S01"]
normal = s01[s01["is_festival"] == 0]
for name, d in [("All days", s01), ("Without festival days", normal)]:
    r = d["revenue_inr"]
    print(f"{name:22}: mean Rs {r.mean():,.0f} | median Rs {r.median():,.0f}")
```

### Step 6. Weighted mean: the true average bill

```python
# Step 6. Weighted mean: the chain's true average bill value
daily_bill = df["revenue_inr"] / df["transactions"]   # average bill on each store-day
print(f"Simple mean of daily average bills : Rs {daily_bill.mean():.2f}")
print(f"Weighted by number of bills        : Rs {np.average(daily_bill, weights=df['transactions']):.2f}")
print(f"Check: total revenue / total bills : Rs {df['revenue_inr'].sum() / df['transactions'].sum():.2f}")
```

### Step 7. A summary table for the manager

```python
# Step 7. Summary for the manager: typical daily footfall of each store
summary = df.groupby(["store_id", "city", "store_type"])["footfall"].agg(["mean", "median"]).round(0)
print(summary.sort_values("median", ascending=False).to_string())
```

## Output

### Step 1

```output
Rows, columns: (8772, 16)
      date store_id  store_type  footfall  revenue_inr
2024-01-01      S01 Supermarket      1615       763590
2024-01-02      S01 Supermarket      1601       807240
2024-01-03      S01 Supermarket      1669       846930
```

### Step 2

```output
Mean revenue   : Rs 444,043
Median revenue : Rs 325,920
Mean - median  : Rs 118,123
```

### Step 3

```output
Revenue: distinct values = 8136 out of 8772 rows
Most repeated revenue value appears 5 times

Mode of discount_pct: [0]
discount_pct
0     4564
5     1733
10    1582
15     893

Most common weekday among the 500 busiest days: ['Sunday']
```

### Step 4

```output
                 mean    median
store_type                     
Express      213056.0  178450.0
Supermarket  767425.0  708690.0
```

### Step 5

```output
All days              : mean Rs 1,076,818 | median Rs 1,041,020
Without festival days : mean Rs 1,050,982 | median Rs 1,027,820
```

### Step 6

```output
Simple mean of daily average bills : Rs 490.94
Weighted by number of bills        : Rs 551.43
Check: total revenue / total bills : Rs 551.43
```

### Step 7

```output
                                                  mean  median
store_id city                      store_type                 
S01      Mumbai                    Supermarket  2209.0  2135.0
S04      Pune                      Supermarket  2068.0  2001.0
S11      Nagpur                    Supermarket  1628.0  1581.0
S07      Nashik                    Supermarket  1491.0  1438.0
S09      Chhatrapati Sambhajinagar Supermarket  1408.0  1363.0
S02      Thane                     Express      1322.0  1286.0
S05      Pune                      Express      1257.0  1227.0
S06      Kolhapur                  Express       830.0   808.0
S12      Amravati                  Express       773.0   756.0
S08      Jalgaon                   Express       750.0   724.0
S10      Nanded                    Express       699.0   681.0
S03      Ratnagiri                 Express       703.0   674.0
```

## Explanation

### Step 2: mean or median for the whole chain?

- Mean ₹4.44 lakh, median ₹3.26 lakh: the mean is ₹1.18 lakh higher.
- ==Mean well above median means a few large values pull the mean up (right skew).==
- Here the large values are the five Supermarkets and the festival days. For "a typical store-day", the median is the honest figure.

### Step 3: when the mode helps

- Revenue has 8,136 different values in 8,772 rows; the most repeated value appears only 5 times. ==For continuous data the mode is almost meaningless.==
- `discount_pct` has only four values, so its mode is useful: **0%**, on 4,564 of 8,772 days (52%). On most days there is no discount.
- `day_of_week` is a category, so only the mode applies: **Sunday** is the most common day among the 500 busiest store-days.
- `.mode()` returns a list, because data can have several modes.

### Step 4: compare groups separately

| Store type | Mean | Median |
|---|---|---|
| Express | ₹2.13 lakh | ₹1.78 lakh |
| Supermarket | ₹7.67 lakh | ₹7.09 lakh |

Splitting by store type explains most of the gap in Step 2. Inside each type the mean is still above the median: Express stores differ in size (Thane vs Nanded), and every store has festival peaks.

### Step 5: extreme days

Removing S01's festival days lowers the mean by ₹25,836 but the median by only ₹13,200: the mean moves about twice as much. With only 32 festival days out of 731, the effect is modest here; with stronger outliers, such as the bulk buyer in the theory note's worked example, it is dramatic.

### Step 6: weighted mean

- The simple mean of the 8,772 daily average bills is ₹490.94. It treats a quiet Express day with 300 bills the same as a busy Supermarket day with 1,500.
- Weighting each day by its number of bills gives ₹551.43, exactly total revenue ÷ total bills.
- ==The chain's average bill is a weighted mean: ₹551.43, not ₹490.94.==

### Step 7: the manager's table

Mean and median footfall are close for every single store (mean slightly higher everywhere, because of festival peaks). Within one store the data are only mildly skewed, so either average works; across mixed stores, use the median or split the groups.

## Try it

On festival days (`is_festival == 1`), what is the mode of `discount_pct`? How many festival store-days had each discount?

Start from: `fest = df[df["is_festival"] == 1]`

> [!answer]- Answer
> ```python
> fest = df[df["is_festival"] == 1]
> print("Mode of discount on festival days:", fest["discount_pct"].mode().tolist())
> print(fest["discount_pct"].value_counts().sort_index().to_string())
> ```
> ```output
> Mode of discount on festival days: [10]
> discount_pct
> 10    352
> 15     32
> ```
> The mode is **10%** (352 of 384 festival store-days). No festival day had a 0% or 5% discount, matching the data card: discounts are at least 10% on festival days.

## Viva questions

1. Define mean, median and mode. Which one is used for categorical data?
2. The chain's mean revenue is ₹4.44 lakh and median ₹3.26 lakh. What does this tell you?
3. Why is the mode of `revenue_inr` not useful, while the mode of `discount_pct` is?
4. Why does `.mode()` in pandas return a list instead of a single number?
5. Why is the average bill ₹551 and not ₹491? Which is correct, and why?
6. What does `np.average(x, weights=w)` calculate? Write its formula.
7. Removing festival days changed S01's mean more than its median. Explain why.
8. When would you report the mean even though the median is more "typical"?

## Flashcards

pandas method for the mean of a column? :: df["col"].mean()
pandas method for the median of a column? :: df["col"].median()
pandas method for the mode of a column? :: df["col"].mode() (returns a Series, since there can be several modes)
NumPy function for a weighted mean? :: np.average(x, weights=w)
How do you compare the mean and median across groups? :: df.groupby("group")["col"].agg(["mean", "median"])
Average bill of a chain = ? :: Total revenue ÷ total bills (a weighted mean of daily average bills)

## Sources

- pandas documentation: [Series API reference (mean, median, mode)](https://pandas.pydata.org/docs/reference/series.html)
- NumPy documentation: [numpy.average](https://numpy.org/doc/stable/reference/generated/numpy.average.html)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
