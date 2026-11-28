---
id: conditional-probability-practical
title: Probabilities from Simulations and Sales Data
subject: prob-stats
level: foundation
type: practical
practical: 2
syllabus: [UDSVI-006]
unit: 2
prerequisites: [conditional-probability, probability-simulation-practical]
related: [probability-basics]
time: 45 min
status: draft
sources:
  - "pandas documentation: crosstab, https://pandas.pydata.org/docs/reference/api/pandas.crosstab.html"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To calculate the probabilities of different outcomes from simulated experiments, and to calculate conditional probabilities, test independence and apply Bayes' theorem on business data.

## Concepts used

- [[probability-basics]]: classical and empirical probability, addition rule.
- [[conditional-probability]]: conditional probability, independence, Bayes' theorem.

## Before the lab

- **Open:** a Google account and the *Open in Colab* link in Setup. Nothing to install; it also runs on a phone, but a laptop is easier.
- **Revise first:** [[conditional-probability]] Q1 (conditional probability), Q3 (independence) and Q4 (Bayes' theorem).
- **Know the data:** skim the dataset's data card (`content/assets/data/sahyadri-mart-sales.md`): one row is one store on one day, 16 columns.
- **Colab basics:** click a cell and press **Shift+Enter** to run it; a cell's output appears just below it.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/conditional-probability-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
- The outputs below come from pandas 3.0 and NumPy 2.5; the notebook gives identical numbers on pandas 2.2 and NumPy 2.0 (current Colab).
- Random numbers use `np.random.default_rng(2026)`, a fixed seed, so your results match these exactly when you run the cells in order.

## Steps

1. Open the notebook with the *Open in Colab* link. You should see the title **Probabilities from Simulations and Sales Data (ABA Unit 2, Practical 2)**.
2. Click *File → Save a copy in Drive*, so your changes are kept. You should see "Copy of" in the notebook's name.
3. Run the **Step 1** cell (Load the sales data and set up the random generator). You should see `Rows, columns: (8772, 16)`.
4. Run the **Step 2** cell (Simulate 100,000 throws of two dice and tabulate the sums). You should see `2      0.0280  0.0278`.
5. Run the **Step 3** cell (Probabilities of events: simulated vs exact). You should see `P(sum >= 10)           : 0.1656   exact 0.1667`.
6. Run the **Step 4** cell (Two events in the sales data: festival day, and high-sales day (a store's top 10%)). You should see `P(festival) = 0.0438`.
7. Run the **Step 5** cell (Joint counts, conditional probabilities and a test of independence). You should see `high            0    1   All`.
8. Run the **Step 6** cell (Bayes' theorem: P(festival | high), by formula and by direct count). You should see `By Bayes' theorem: 0.290   By direct count: 0.290`.
9. Add a new cell below the last step (*+ Code*), type the **Try it** variation and run it. You should see numbers you can check against the collapsed answer.

## Code

### Step 1. Load the sales data and set up the random generator

```python
# Step 1. Load the sales data and set up the random generator
import numpy as np
import pandas as pd

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
df = pd.read_csv(url, parse_dates=["date"])
rng = np.random.default_rng(2026)
print("Rows, columns:", df.shape)
```

### Step 2. Simulate 100,000 throws of two dice and tabulate the sums

```python
# Step 2. Simulate 100,000 throws of two dice and tabulate the sums
d1 = rng.integers(1, 7, size=100_000)
d2 = rng.integers(1, 7, size=100_000)
total = d1 + d2
sim = pd.Series(total).value_counts(normalize=True).sort_index()
exact = pd.Series({s: (6 - abs(s - 7)) / 36 for s in range(2, 13)})
print(pd.DataFrame({"simulated": sim.round(4), "exact": exact.round(4)}).to_string())
```

### Step 3. Probabilities of events: simulated vs exact

```python
# Step 3. Probabilities of events: simulated vs exact
first_even = d1 % 2 == 0
print(f"P(sum >= 10)           : {(total >= 10).mean():.4f}   exact {6/36:.4f}")
print(f"P(doubles)             : {(d1 == d2).mean():.4f}   exact {6/36:.4f}")
print(f"P(sum is 8)            : {(total == 8).mean():.4f}   exact {5/36:.4f}")
print(f"P(sum is 8 | 1st even) : {(total[first_even] == 8).mean():.4f}   exact {3/18:.4f}")
```

### Step 4. Two events in the sales data: festival day, and high-sales day (a store's top 10%)

```python
# Step 4. Two events in the sales data: festival day, and high-sales day (a store's top 10%)
p90 = df.groupby("store_id")["revenue_inr"].transform(lambda s: s.quantile(0.9))
df["high"] = (df["revenue_inr"] > p90).astype(int)
print(f"P(festival) = {df['is_festival'].mean():.4f}")
print(f"P(high)     = {df['high'].mean():.4f}")
```

### Step 5. Joint counts, conditional probabilities and a test of independence

```python
# Step 5. Joint counts, conditional probabilities and a test of independence
print(pd.crosstab(df["is_festival"], df["high"], margins=True).to_string())
p_high_fest = df.loc[df["is_festival"] == 1, "high"].mean()
p_high_not = df.loc[df["is_festival"] == 0, "high"].mean()
print(f"\nP(high | festival)     = {p_high_fest:.3f}")
print(f"P(high | not festival) = {p_high_not:.3f}")
both = (df["high"] & df["is_festival"]).mean()
print(f"P(high and festival) = {both:.4f}  vs  P(high) x P(festival) = {df['high'].mean() * df['is_festival'].mean():.4f}")
```

### Step 6. Bayes' theorem: P(festival | high), by formula and by direct count

```python
# Step 6. Bayes' theorem: P(festival | high), by formula and by direct count
p_f, p_h = df["is_festival"].mean(), df["high"].mean()
bayes = p_high_fest * p_f / p_h
direct = df.loc[df["high"] == 1, "is_festival"].mean()
print(f"By Bayes' theorem: {bayes:.3f}   By direct count: {direct:.3f}")
```

## Output

### Step 1

```output
Rows, columns: (8772, 16)
```

### Step 2

```output
    simulated   exact
2      0.0280  0.0278
3      0.0560  0.0556
4      0.0842  0.0833
5      0.1106  0.1111
6      0.1394  0.1389
7      0.1670  0.1667
8      0.1383  0.1389
9      0.1109  0.1111
10     0.0832  0.0833
11     0.0550  0.0556
12     0.0274  0.0278
```

### Step 3

```output
P(sum >= 10)           : 0.1656   exact 0.1667
P(doubles)             : 0.1656   exact 0.1667
P(sum is 8)            : 0.1383   exact 0.1389
P(sum is 8 | 1st even) : 0.1655   exact 0.1667
```

### Step 4

```output
P(festival) = 0.0438
P(high)     = 0.0999
```

### Step 5

```output
high            0    1   All
is_festival                 
0            7766  622  8388
1             130  254   384
All          7896  876  8772

P(high | festival)     = 0.661
P(high | not festival) = 0.074
P(high and festival) = 0.0290  vs  P(high) x P(festival) = 0.0044
```

### Step 6

```output
By Bayes' theorem: 0.290   By direct count: 0.290
```

## Explanation

### Steps 2–3: outcomes of a simulated experiment

- The simulated share of every sum from 2 to 12 is within 0.001 of the exact value $(6 - |s - 7|)/36$; 7 is the most likely sum.
- Events are just conditions on the arrays: `total >= 10`, `d1 == d2`.
- A conditional probability by simulation: ==keep only the cases where the condition holds, then take the share.== `total[first_even] == 8` gives 0.1655 against the exact $3/18 = 0.1667$, while $P(\text{sum is } 8) = 5/36 = 0.139$: knowing the first die is even raises the chance of an 8.

### Step 4: events in real data

A "high-sales day" is a store's own top 10% of days (so a small store's busy day counts too). $P(\text{festival}) = 0.044$; $P(\text{high}) = 0.100$.

### Step 5: conditional probability and independence

| | Value |
|---|---|
| $P(\text{high} \mid \text{festival})$ | 254 / 384 = 0.661 |
| $P(\text{high} \mid \text{not festival})$ | 622 / 8,388 = 0.074 |
| $P(\text{high and festival})$ | 0.0290 |
| $P(\text{high}) \times P(\text{festival})$ | 0.0044 |

==Festival days and high-sales days are strongly dependent==: the joint probability is about 6.6 times what independence would give.

### Step 6: Bayes' theorem

$P(\text{festival} \mid \text{high}) = \frac{0.661 \times 0.0438}{0.0999} = 0.290$, the same as counting directly (254 of 876 high days). Although two-thirds of festival days are high, only 29% of high days are festivals: most high days are ordinary weekends.

## Common errors and fixes

- **`NameError: name 'df' is not defined`** (or `'rng'`, `'np'`, `'stats'`): a cell was run before Step 1, or Colab restarted and forgot everything. **Fix:** *Runtime → Run before* on the current cell, or run the cells again from Step 1.
- **`HTTPError: HTTP Error 404: Not Found`** in Step 1: the URL was typed or copied incompletely. **Fix:** copy both `url` lines exactly; the file name is `sahyadri-mart-sales.csv`. With no internet you get a `URLError` instead.
- **`KeyError: 'revenue'`**: a column name was mistyped. **Fix:** run `print(df.columns)` and copy the exact name (`revenue_inr`).
- **Your numbers differ slightly from the note:** cells were run out of order or more than once, so the random generator moved on. **Fix:** *Runtime → Restart and run all*.

## Try it

Is a weekend day more likely to be a high-sales day? Compute $P(\text{high} \mid \text{weekend})$ and $P(\text{high} \mid \text{weekday})$.

Start from: `weekend = df["day_of_week"].isin(["Saturday", "Sunday"])`

> [!answer]- Answer
> ```python
> weekend = df["day_of_week"].isin(["Saturday", "Sunday"])
> print(f"P(high | weekend) = {df.loc[weekend, 'high'].mean():.3f}")
> print(f"P(high | weekday) = {df.loc[~weekend, 'high'].mean():.3f}")
> ```
> ```output
> P(high | weekend) = 0.240
> P(high | weekday) = 0.044
> ```
> Weekends are more than five times as likely as weekdays to be high-sales days, which explains why most high days are not festivals (Step 6).

## Viva questions

1. How do you estimate a conditional probability from a simulation?
2. Why is $P(\text{sum is } 8 \mid \text{first die even})$ different from $P(\text{sum is } 8)$?
3. Define a high-sales day as used here. Why use each store's own top 10%?
4. How do Step 5's numbers show that festival and high-sales days are not independent?
5. State Bayes' theorem and use it to get $P(\text{festival} \mid \text{high})$.
6. Why is $P(\text{festival} \mid \text{high})$ so much smaller than $P(\text{high} \mid \text{festival})$?

## Flashcards

pandas: two-way table of counts with totals? :: pd.crosstab(a, b, margins=True)
Conditional probability from a DataFrame? :: df.loc[condition, 'event'].mean() for a 0/1 event column
Test of independence from data? :: Compare P(A and B) with P(A) × P(B)
Sahyadri Mart: P(high | festival) vs P(high | not festival)? :: About 0.66 vs 0.07

## Sources

- [pandas documentation: crosstab](https://pandas.pydata.org/docs/reference/api/pandas.crosstab.html)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
