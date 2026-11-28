---
id: dispersion-practical
title: Variance and Standard Deviation of Sales Data
subject: prob-stats
level: foundation
type: practical
practical: 4
syllabus: [UDSVI-006]
unit: 1
prerequisites: [dispersion, central-tendency-practical]
related: [exploratory-data-analysis-practical]
time: 45 min
status: reviewed
sources:
  - "pandas documentation: Series.var, Series.std, https://pandas.pydata.org/docs/reference/series.html"
  - "NumPy documentation: numpy.std (ddof parameter), https://numpy.org/doc/stable/reference/generated/numpy.std.html"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To calculate the variance and standard deviation of a business dataset, by hand and in Python, and to compare the variability of stores using the coefficient of variation.

## Concepts used

- [[dispersion]]: range, variance, standard deviation and CV.
- [[central-tendency-practical]]: the same dataset and its averages.

## Before the lab

- **Open:** a Google account and the *Open in Colab* link in Setup. Nothing to install; it also runs on a phone, but a laptop is easier.
- **Revise first:** [[dispersion]] Q3 (variance), Q4 (standard deviation), Q5 (why n − 1) and Q6 (coefficient of variation).
- **Know the data:** skim the dataset's data card (`content/assets/data/sahyadri-mart-sales.md`): one row is one store on one day, 16 columns.
- **Colab basics:** click a cell and press **Shift+Enter** to run it; a cell's output appears just below it.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/dispersion-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
- Most steps use **S05**, the Pune Express store.
- The outputs below come from pandas 3. On pandas 2.x (current Colab) all numbers are the same.

## Steps

1. Open the notebook with the *Open in Colab* link. You should see the title **Dispersion Practical (ABA Unit 1, Practical 4)**.
2. Click *File → Save a copy in Drive*, so your changes are kept. You should see "Copy of" in the notebook's name.
3. Run the **Step 1** cell (Load the data and pick one store: S05, the Pune Express store). You should see `Rows, columns: (8772, 16) | days for S05: 731`.
4. Run the **Step 2** cell (Variance and standard deviation by hand: S05 footfall, first 7 days). You should see `x  x - mean  (x - mean)^2`.
5. Run the **Step 3** cell (The same with pandas and NumPy: watch the default divisor). You should see `pandas w.var(), w.std()  : 44438.24 210.8   (divides by n-1)`.
6. Run the **Step 4** cell (All the measures for S05's daily footfall over two years). You should see `Mean           : 1257.3`.
7. Run the **Step 5** cell (Which kind of store has steadier daily revenue? Compare SD and CV). You should see `Express      213056.1   94144.6    44.2`.
8. Run the **Step 6** cell (Rank all 12 stores by the CV of daily footfall). You should see `S06      Kolhapur                    829.7  163.8    19.7`.
9. Run the **Step 7** cell (Why the range is fragile: drop S01's single busiest day). You should see `All 731 days : range Rs 2,413,570 | SD Rs 250,614`.
10. Add a new cell below the last step (*+ Code*), type the **Try it** variation and run it. You should see numbers you can check against the collapsed answer.

## Code

### Step 1. Load the data and pick one store

```python
# Step 1. Load the data and pick one store: S05, the Pune Express store
import pandas as pd
import numpy as np

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
df = pd.read_csv(url, parse_dates=["date"])
s05 = df[df["store_id"] == "S05"]
print("Rows, columns:", df.shape, "| days for S05:", len(s05))
```

### Step 2. Variance and SD by hand for one week

```python
# Step 2. Variance and standard deviation by hand: S05 footfall, first 7 days
week = s05["footfall"].head(7).to_numpy()
mean = week.mean()
dev = week - mean
print(pd.DataFrame({"x": week, "x - mean": dev.round(2), "(x - mean)^2": (dev**2).round(2)}).to_string(index=False))
n, ss = len(week), (dev**2).sum()
print(f"\nn = {n}, mean = {mean:.2f}, sum of squared deviations = {ss:.2f}")
print(f"Sample variance     s^2 = SS/(n-1) = {ss/(n-1):.2f}  ->  s     = {np.sqrt(ss/(n-1)):.2f}")
print(f"Population variance     = SS/n     = {ss/n:.2f}  ->  sigma = {np.sqrt(ss/n):.2f}")
```

### Step 3. The same with pandas and NumPy

```python
# Step 3. The same with pandas and NumPy: watch the default divisor
w = s05["footfall"].head(7)
print("pandas w.var(), w.std()  :", round(w.var(), 2), round(w.std(), 2), "  (divides by n-1)")
print("NumPy  np.var(), np.std():", round(np.var(week), 2), round(np.std(week), 2), "  (divides by n)")
print("NumPy  np.std(ddof=1)    :", round(np.std(week, ddof=1), 2))
```

### Step 4. All the measures for two years of data

```python
# Step 4. All the measures for S05's daily footfall over two years
f = s05["footfall"]
print(f"Mean           : {f.mean():.1f}")
print(f"Range          : {f.max()} - {f.min()} = {f.max() - f.min()}")
print(f"Variance (s^2) : {f.var():.1f}")
print(f"Std dev (s)    : {f.std():.1f}")
print(f"CV             : {f.std() / f.mean() * 100:.1f}%")
```

### Step 5. Compare store types with SD and CV

```python
# Step 5. Which kind of store has steadier daily revenue? Compare SD and CV
g = df.groupby("store_type")["revenue_inr"].agg(["mean", "std"])
g["cv_pct"] = g["std"] / g["mean"] * 100
print(g.round(1).to_string())
```

### Step 6. Rank all stores by CV

```python
# Step 6. Rank all 12 stores by the CV of daily footfall
s = df.groupby(["store_id", "city"])["footfall"].agg(["mean", "std"])
s["cv_pct"] = s["std"] / s["mean"] * 100
print(s.round(1).sort_values("cv_pct").to_string())
```

### Step 7. Range versus SD with one extreme day removed

```python
# Step 7. Why the range is fragile: drop S01's single busiest day
r = df.loc[df["store_id"] == "S01", "revenue_inr"]
r2 = r.drop(r.idxmax())
print(f"All 731 days : range Rs {r.max() - r.min():,} | SD Rs {r.std():,.0f}")
print(f"Without 1 day: range Rs {r2.max() - r2.min():,} | SD Rs {r2.std():,.0f}")
```

## Output

### Step 1

```output
Rows, columns: (8772, 16) | days for S05: 731
```

### Step 2

```output
   x  x - mean  (x - mean)^2
1036    -73.71       5433.80
 943   -166.71      27793.65
 974   -135.71      18418.37
1088    -21.71        471.51
1108     -1.71          2.94
1569    459.29     210943.37
1050    -59.71       3565.80

n = 7, mean = 1109.71, sum of squared deviations = 266629.43
Sample variance     s^2 = SS/(n-1) = 44438.24  ->  s     = 210.80
Population variance     = SS/n     = 38089.92  ->  sigma = 195.17
```

### Step 3

```output
pandas w.var(), w.std()  : 44438.24 210.8   (divides by n-1)
NumPy  np.var(), np.std(): 38089.92 195.17   (divides by n)
NumPy  np.std(ddof=1)    : 210.8
```

### Step 4

```output
Mean           : 1257.3
Range          : 2486 - 721 = 1765
Variance (s^2) : 61607.7
Std dev (s)    : 248.2
CV             : 19.7%
```

### Step 5

```output
                 mean       std  cv_pct
store_type                             
Express      213056.1   94144.6    44.2
Supermarket  767425.5  282443.8    36.8
```

### Step 6

```output
                                      mean    std  cv_pct
store_id city                                            
S06      Kolhapur                    829.7  163.8    19.7
S05      Pune                       1257.3  248.2    19.7
S09      Chhatrapati Sambhajinagar  1407.8  279.1    19.8
S10      Nanded                      699.3  139.8    20.0
S08      Jalgaon                     749.9  151.9    20.3
S02      Thane                      1322.4  269.2    20.4
S01      Mumbai                     2208.6  451.8    20.5
S04      Pune                       2068.4  424.1    20.5
S12      Amravati                    773.2  161.8    20.9
S11      Nagpur                     1628.0  341.4    21.0
S07      Nashik                     1490.6  314.2    21.1
S03      Ratnagiri                   703.0  154.7    22.0
```

### Step 7

```output
All 731 days : range Rs 2,413,570 | SD Rs 250,614
Without 1 day: range Rs 1,623,260 | SD Rs 240,391
```

## Explanation

### Step 2: the formula, one line at a time

1. Mean of the 7 days: 1,109.71 visitors.
2. Deviations $x - \bar{x}$: they add up to 0, as always.
3. Square and add: sum of squares (SS) = 266,629.43.
4. Sample variance $s^2 = SS/(n-1) = 266629.43/6 = 44{,}438.24$ visitors².
5. SD $s = \sqrt{44438.24} = 210.80$ visitors.

Day 6 (Saturday, 6 Jan 2024: 1,569 visitors) alone gives 210,943 of the 266,629, about 79%. ==Squaring makes one large deviation dominate the variance.==

### Step 3: same data, two answers

| Function | Divides by | SD |
|---|---|---|
| pandas `.std()` | $n - 1$ (sample) | 210.80 |
| NumPy `np.std()` | $n$ (population) | 195.17 |
| NumPy `np.std(ddof=1)` | $n - 1$ | 210.80 |

`ddof` ("delta degrees of freedom") is what is subtracted from $n$. ==pandas uses n − 1 by default; NumPy uses n.== With only 7 values the difference is 8%; with 731 values it is negligible.

### Step 4: S05 over two years

On a typical day S05's footfall is about 1,257 ± 248 visitors (mean ± SD). The range (721 to 2,486) is seven times the SD, because it is set by the two most extreme days of two years. The CV of 19.7% is the figure to compare with other stores.

### Steps 5–6: SD versus CV

- **Step 5:** Supermarkets have three times the SD of Express stores (₹2.82 lakh vs ₹0.94 lakh), but a **lower** CV (36.8% vs 44.2%). Relative to their size, they are steadier.
- Both CVs are inflated because each group mixes stores of different sizes.
- **Step 6:** store by store, every CV lies between 19.7% and 22.0%. ==Use the CV, not the SD, to compare variability between groups with different means.== Ratnagiri (S03), in the heaviest-rain region, varies most; rain is a likely reason, which a later practical can test.

### Step 7: range is fragile, SD is steadier

Removing one day out of 731 (a Diwali-season peak) cuts S01's range by 33% (₹24.1 lakh → ₹16.2 lakh) but its SD by only 4% (₹2.51 lakh → ₹2.40 lakh). The range depends on just two values; the SD uses all of them.

## Common errors and fixes

- **`NameError: name 'df' is not defined`** (or `'rng'`, `'np'`, `'stats'`): a cell was run before Step 1, or Colab restarted and forgot everything. **Fix:** *Runtime → Run before* on the current cell, or run the cells again from Step 1.
- **`HTTPError: HTTP Error 404: Not Found`** in Step 1: the URL was typed or copied incompletely. **Fix:** copy both `url` lines exactly; the file name is `sahyadri-mart-sales.csv`. With no internet you get a `URLError` instead.
- **`KeyError: 'revenue'`**: a column name was mistyped. **Fix:** run `print(df.columns)` and copy the exact name (`revenue_inr`).
- **Your SD differs from the note (for example 195.17 instead of 210.80):** `np.std()` divides by n, pandas `.std()` by n − 1. **Fix:** use `np.std(x, ddof=1)` for a sample SD.
- **`TypeError: Could not convert ['MondayTuesday…'] to numeric`** (pandas 3: `Cannot perform reduction 'mean' with string dtype`): `df.mean()` was called on the whole table, which includes text columns. **Fix:** choose a column, `df["revenue_inr"].mean()`, or use `df.mean(numeric_only=True)`.

## Try it

Compare the daily **revenue** of the Mumbai supermarket (S01) and the Ratnagiri Express store (S03). Which has the larger SD? Which is relatively more variable?

Start from: `df[df["store_id"].isin(["S01", "S03"])].groupby("store_id")["revenue_inr"]`

> [!answer]- Answer
> ```python
> r = df[df["store_id"].isin(["S01", "S03"])].groupby("store_id")["revenue_inr"].agg(["mean", "std"])
> r["cv_pct"] = r["std"] / r["mean"] * 100
> print(r.round(1).to_string())
> ```
> ```output
>                mean       std  cv_pct
> store_id                             
> S01       1076818.0  250613.7    23.3
> S03        158477.6   39387.1    24.9
> ```
> S01's SD (₹2.51 lakh) is more than six times S03's (₹0.39 lakh), but S03 has the **higher CV** (24.9% vs 23.3%), so the small Ratnagiri store is relatively a little more variable.

## Viva questions

1. Define variance and standard deviation. Why do we square the deviations?
2. Why is the unit of variance "visitors²"? Why do we usually report the SD instead?
3. What is the difference between `np.std(x)` and `pd.Series(x).std()`? What does `ddof` mean?
4. When should you divide by $n$ and when by $n - 1$?
5. In Step 2, why did one day contribute 79% of the sum of squares?
6. Supermarkets have a larger SD but a smaller CV than Express stores. Which kind is more consistent, and why?
7. Why did removing one day change the range so much more than the SD?
8. Write the formula for the coefficient of variation. When is it misleading?

## Flashcards

pandas method for the sample variance of a column? :: df["col"].var() (divides by n − 1)
pandas method for the sample SD of a column? :: df["col"].std() (divides by n − 1)
Default divisor of np.std()? :: n (population); use ddof=1 for n − 1
What does ddof mean? :: Delta degrees of freedom: the divisor is n − ddof
How do you compute the CV of a column in pandas? :: df["col"].std() / df["col"].mean() * 100
How do you get mean and SD for each group? :: df.groupby("group")["col"].agg(["mean", "std"])

## Sources

- pandas documentation: [Series API reference (var, std)](https://pandas.pydata.org/docs/reference/series.html)
- NumPy documentation: [numpy.std](https://numpy.org/doc/stable/reference/generated/numpy.std.html)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
