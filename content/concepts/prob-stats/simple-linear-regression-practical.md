---
id: simple-linear-regression-practical
title: Regression of Sales Revenue on Advertising
subject: prob-stats
level: foundation
type: practical
practical: 8
syllabus: [UDSVI-006]
unit: 1
prerequisites: [correlation-practical, simple-linear-regression]
related: [correlation, covariance]
tags: [interview]
time: 60 min
status: reviewed
sources:
  - "James R. Evans, Business Analytics, 3rd ed., Pearson, 2021, Ch. 8: Trendlines and Regression Analysis"
  - "NumPy documentation: numpy.polyfit, https://numpy.org/doc/stable/reference/generated/numpy.polyfit.html"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To apply simple linear regression to find the relationship between advertising expenditure and sales revenue, and to show why a line fitted across different-sized stores overstates the effect of advertising.

## Concepts used

- [[simple-linear-regression]]: the least-squares line $\hat{y} = a + bx$ (theory note to come in Unit 3; the formulas needed here are in the Explanation).
- [[correlation]] and [[correlation-practical]]: r, $r^2$ and the store-size confounder.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/simple-linear-regression-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
- **x** = `ad_spend_inr` (ad spend that day), **y** = `revenue_inr` (revenue that day).
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
x, y = df["ad_spend_inr"], df["revenue_inr"]
print("Rows, columns:", df.shape)
```

### Step 2. Least-squares line for the whole chain

```python
# Step 2. Least-squares line for the whole chain: revenue = a + b * ad_spend
b = ((x - x.mean()) * (y - y.mean())).sum() / ((x - x.mean())**2).sum()
a = y.mean() - b * x.mean()
r = x.corr(y)
print(f"Slope b     : {b:.2f}  (Rs of revenue per extra Rs 1 of ads)")
print(f"Intercept a : {a:,.0f}")
print(f"r = {r:.3f},  R^2 = {r**2:.3f}")
```

### Step 3. Check with NumPy

```python
# Step 3. Check with NumPy's built-in least-squares fit
b_np, a_np = np.polyfit(x, y, 1)
print(f"np.polyfit: slope = {b_np:.2f}, intercept = {a_np:,.0f}")
```

### Step 4. One line per store

```python
# Step 4. Fit the same line inside each store
def fit(g):
    gx, gy = g["ad_spend_inr"], g["revenue_inr"]
    slope = gx.cov(gy) / gx.var()
    return pd.Series({"slope_b": slope, "intercept_a": gy.mean() - slope * gx.mean(),
                      "r": gx.corr(gy), "R2": gx.corr(gy)**2})
per_store = df.groupby("store_id")[["ad_spend_inr", "revenue_inr"]].apply(fit)
print(per_store.round(3).to_string())
print(f"\nMedian within-store slope: {per_store['slope_b'].median():.1f}")
```

### Step 5. Remove store size

```python
# Step 5. Remove store size: compare each day with its own store's average
xd = x - df.groupby("store_id")["ad_spend_inr"].transform("mean")
yd = y - df.groupby("store_id")["revenue_inr"].transform("mean")
b_within = (xd * yd).sum() / (xd**2).sum()
print(f"Chain-wide slope   : {b:.1f}")
print(f"Within-store slope : {b_within:.1f}")
print(f"Within-store r     : {xd.corr(yd):.2f}")
```

### Step 6. Predict with the right line

```python
# Step 6. Predict S01's revenue on a day with Rs 10,000 of ads: which line?
s01, p = df[df["store_id"] == "S01"], per_store.loc["S01"]
print(f"S01 average day : ad Rs {s01['ad_spend_inr'].mean():,.0f}, revenue Rs {s01['revenue_inr'].mean():,.0f}")
print(f"Chain-wide line : Rs {a + b * 10000:,.0f}")
print(f"S01's own line  : Rs {p['intercept_a'] + p['slope_b'] * 10000:,.0f}")
```

### Step 7. Plot the lines

```python
# Step 7. Plot the chain-wide line and two stores' own lines
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(7, 4.5))
ax.scatter(x, y / 1e5, s=3, alpha=0.06, color="grey", label="All stores")
for sid, colour in [("S01", "tab:blue"), ("S10", "tab:orange")]:
    g, p = df[df["store_id"] == sid], per_store.loc[sid]
    xs = np.linspace(g["ad_spend_inr"].min(), g["ad_spend_inr"].max(), 50)
    ax.scatter(g["ad_spend_inr"], g["revenue_inr"] / 1e5, s=5, alpha=0.4, color=colour)
    ax.plot(xs, (p["intercept_a"] + p["slope_b"] * xs) / 1e5, color=colour, lw=2.5, label=f"{sid} own line")
xs = np.linspace(0, x.max(), 50)
ax.plot(xs, (a + b * xs) / 1e5, color="black", lw=2, ls="--", label="Chain-wide line")
ax.set_xlabel("Ad spend that day (Rs)")
ax.set_ylabel("Revenue that day (Rs lakh)")
ax.set_title("One line for the chain vs one line per store")
ax.legend()
plt.show()
```

## Output

### Step 1

```output
Rows, columns: (8772, 16)
```

### Step 2

```output
Slope b     : 72.53  (Rs of revenue per extra Rs 1 of ads)
Intercept a : 160,589
r = 0.608,  R^2 = 0.369
```

### Step 3

```output
np.polyfit: slope = 72.53, intercept = 160,589
```

### Step 4

```output
          slope_b  intercept_a      r     R2
store_id                                    
S01        20.375   952726.084  0.254  0.065
S02        14.063   312514.498  0.214  0.046
S03         9.821   134842.061  0.295  0.087
S04        26.268   796402.988  0.343  0.118
S05        14.400   286411.545  0.251  0.063
S06         8.633   171324.361  0.229  0.052
S07        15.451   502708.597  0.326  0.106
S08         8.890   137898.042  0.274  0.075
S09        11.316   471223.181  0.263  0.069
S10         7.826   125764.218  0.262  0.069
S11        16.988   567350.830  0.335  0.112
S12        11.359   143629.651  0.308  0.095

Median within-store slope: 12.7
```

### Step 5

```output
Chain-wide slope   : 72.5
Within-store slope : 16.9
Within-store r     : 0.29
```

### Step 6

```output
S01 average day : ad Rs 6,091, revenue Rs 1,076,818
Chain-wide line : Rs 885,875
S01's own line  : Rs 1,156,472
```

### Step 7

![Scatter plot of daily ad spend against revenue in rupees lakh. Faint grey points show all stores. Blue S01 points sit high, around 8 to 15 lakh, with a gently rising blue line. Orange S10 points sit near 1 to 2 lakh with an almost flat orange line. A steep dashed black chain-wide line cuts across from about 1.6 lakh to 17.6 lakh, far steeper than either store's own line](../../assets/img/prob-stats/simple-linear-regression-practical-step7.png)

## Explanation

### The least-squares line

Regression fits a straight line $\hat{y} = a + bx$ that predicts $y$ from $x$. **Least squares** chooses $a$ and $b$ so that the sum of squared prediction errors $\sum (y_i - \hat{y}_i)^2$ is as small as possible. The solution:

$$b = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2} = \frac{\text{Cov}(x, y)}{s_x^2} \qquad a = \bar{y} - b\bar{x}$$

- **Slope $b$:** the change in predicted $y$ for a one-unit increase in $x$.
- **Intercept $a$:** the predicted $y$ when $x = 0$.
- ==The regression line always passes through the point $(\bar{x}, \bar{y})$.==

### Steps 2–3: the chain-wide line

$\hat{y} = 160{,}589 + 72.53x$. Read literally: every extra ₹1 of ads goes with ₹72.53 more revenue, and a day with no ads would bring ₹1.6 lakh. $R^2 = 0.369$: ad spend explains 37% of the variation in daily revenue across the chain. `np.polyfit(x, y, 1)` gives the same line.

### Steps 4–5: one line per store

| Line | Slope (₹ revenue per ₹1 ads) | $R^2$ |
|---|---|---|
| Whole chain | 72.5 | 0.37 |
| Each store | 7.8 (Nanded) to 26.3 (Pune S04), median 12.7 | 0.05 to 0.12 |
| Pooled within-store | 16.9 | 0.08 ($r = 0.29$) |

==The chain-wide slope is about four times the within-store slope, because store size raises both ad spend and revenue.== The steep chain line mostly joins the low Express cluster to the high Supermarket cluster; it describes the difference between stores, not the effect of spending more on a given day.

Inside a store, ads explain only 5–12% of daily variation. Weekday, season, festivals and rain matter far more.

### Step 6: prediction needs the right line

- The chain line predicts ₹8.86 lakh for S01 at ₹10,000 of ads: **less than S01's average day** (₹10.77 lakh at ₹6,091 of ads). Clearly wrong for this store.
- S01's own line predicts ₹11.56 lakh: about ₹79,650 more than an average day, for ₹3,909 more ads, about ₹20 of sales per extra ₹1.
- Whether that pays depends on the **margin**, not on revenue: at an assumed 10% gross margin, ₹20 of sales earns ₹2 for each ₹1 of ads.

### Step 7: what the picture shows

Each store's own line is shallow; the dashed chain line is steep because it climbs from the orange cluster to the blue one. ==Predict within the group and the range of x the line was fitted on.== Using a line far outside its data (for example, S10 at ₹20,000) is extrapolation.

### Cautions

- Even 16.9 may be too high: within each store, ad spend is about 27% higher on festival days, which have high sales anyway. The Try it tests this.
- The data card says ad spend has diminishing returns, so a straight line is only an approximation.
- Regression shows association. Proving that ads *cause* sales needs a controlled experiment.

## Try it

Remove festival days (`is_festival == 1`) and recompute the pooled within-store slope and r. Does the effect of ads shrink?

Start from: `nf = df[df["is_festival"] == 0]`, then repeat Step 5 on `nf`.

> [!answer]- Answer
> ```python
> nf = df[df["is_festival"] == 0]
> xd = nf["ad_spend_inr"] - nf.groupby("store_id")["ad_spend_inr"].transform("mean")
> yd = nf["revenue_inr"] - nf.groupby("store_id")["revenue_inr"].transform("mean")
> print(f"Within-store slope, festival days removed: {(xd * yd).sum() / (xd**2).sum():.1f}")
> print(f"Within-store r, festival days removed    : {xd.corr(yd):.2f}")
> ```
> ```output
> Within-store slope, festival days removed: 12.3
> Within-store r, festival days removed    : 0.25
> ```
> The slope falls from 16.9 to 12.3. Festivals were a second confounder: stores advertise more before festivals, and festivals raise sales on their own. Controlling several variables at once is the job of multiple regression (Unit 3).

## Viva questions

1. Write the least-squares formulas for the slope and the intercept.
2. Interpret the slope 72.53 and the intercept 160,589 in business terms.
3. What does $R^2 = 0.369$ mean? How is it related to r?
4. Why is the chain-wide slope (72.5) so much larger than the within-store slope (16.9)?
5. The chain line predicts less revenue for S01 at ₹10,000 of ads than S01 earns on an average day. Why?
6. What is extrapolation, and why is it risky?
7. Removing festival days lowered the slope from 16.9 to 12.3. What does this tell you?
8. Does a positive slope prove that advertising causes higher sales? What would?

## Flashcards

Equation of a simple regression line? :: ŷ = a + bx
Least-squares slope formula? :: b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)² = Cov(x, y) / Var(x)
Least-squares intercept formula? :: a = ȳ − b x̄
What does the slope b mean? :: The change in predicted y for a one-unit increase in x
Which point does the regression line always pass through? :: (x̄, ȳ)
NumPy function for a straight-line fit? :: np.polyfit(x, y, 1) returns [slope, intercept]
R² in simple regression equals? :: r², the share of variation in y explained by the line
Sahyadri Mart ad-spend slope: chain-wide vs within store? :: About ₹72.5 vs ₹16.9 of revenue per ₹1 of ads

## Sources

- James R. Evans, *Business Analytics*, 3rd ed., Pearson, 2021, Ch. 8: Trendlines and Regression Analysis
- NumPy documentation: [numpy.polyfit](https://numpy.org/doc/stable/reference/generated/numpy.polyfit.html)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
