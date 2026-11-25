---
id: correlation-practical
title: Correlation Analysis of Sales Data
subject: prob-stats
level: foundation
type: practical
practical: 7
syllabus: [UDSVI-006]
unit: 1
prerequisites: [correlation, dispersion-practical]
related: [covariance, exploratory-data-analysis-practical, simple-linear-regression-practical]
time: 60 min
status: reviewed
sources:
  - "pandas documentation: DataFrame.corr, https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.corr.html"
  - "Matplotlib documentation: Axes.scatter, https://matplotlib.org/stable/api/_as_gen/matplotlib.axes.Axes.scatter.html"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To conduct correlation analysis on a business dataset, identify which variables are related, and check whether a strong correlation is caused by a hidden third variable.

## Concepts used

- [[covariance]] and [[correlation]]: Pearson's r, its properties, and confounders.
- [[exploratory-data-analysis-practical]]: Step 8 of that practical first spotted the ad-spend puzzle studied here.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/correlation-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
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
```

### Step 2. Pearson's r by its formula

```python
# Step 2. Pearson's r by its formula: footfall vs revenue
x, y = df["footfall"], df["revenue_inr"]
cov_xy = ((x - x.mean()) * (y - y.mean())).sum() / (len(x) - 1)
r = cov_xy / (x.std() * y.std())
print(f"Covariance   : {cov_xy:,.0f}  (visitors x Rs)")
print(f"r by formula : {r:.4f}")
print(f"r by pandas  : {x.corr(y):.4f}")
```

### Step 3. Change of units

```python
# Step 3. Change the unit of revenue to Rs lakh: covariance changes, r does not
y_lakh = y / 1e5
print(f"Covariance (revenue in Rs lakh): {x.cov(y_lakh):,.2f}")
print(f"r          (revenue in Rs lakh): {x.corr(y_lakh):.4f}")
```

### Step 4. Correlation matrix

```python
# Step 4. Correlation matrix of the main business variables
cols = {"store_area_sqft": "area", "ad_spend_inr": "ad_spend", "discount_pct": "discount",
        "rainfall_mm": "rain", "footfall": "footfall", "transactions": "bills", "revenue_inr": "revenue"}
print(df[list(cols)].rename(columns=cols).corr().round(2).to_string())
```

### Step 5. Scatter plot coloured by store type

```python
# Step 5. Scatter plot: ad spend vs revenue, coloured by store type
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(7, 4.5))
for t, colour in [("Express", "tab:orange"), ("Supermarket", "tab:blue")]:
    g = df[df["store_type"] == t]
    ax.scatter(g["ad_spend_inr"], g["revenue_inr"] / 1e5, s=4, alpha=0.3, color=colour, label=t)
ax.set_xlabel("Ad spend that day (Rs)")
ax.set_ylabel("Revenue that day (Rs lakh)")
ax.set_title("Ad spend vs revenue, all 12 stores")
ax.legend(markerscale=4)
plt.show()
```

### Step 6. Correlation across the chain and within groups

```python
# Step 6. Ad spend vs revenue: whole chain, each store type, each store
print(f"Whole chain : r = {df['ad_spend_inr'].corr(df['revenue_inr']):.2f}")
for t, g in df.groupby("store_type"):
    print(f"{t:12}: r = {g['ad_spend_inr'].corr(g['revenue_inr']):.2f}")
per_store = df.groupby("store_id").apply(
    lambda g: g["ad_spend_inr"].corr(g["revenue_inr"]), include_groups=False)
print("\nWithin each store:")
print(per_store.round(2).to_string())
print(f"Median within-store r: {per_store.median():.2f}")
```

### Step 7. The hidden third variable

```python
# Step 7. The hidden third variable: store size
stores = df.groupby(["store_id", "store_type"])[["store_area_sqft", "ad_spend_inr", "revenue_inr"]].mean()
print(stores.round(0).astype(int).to_string())
print(f"\nAcross the 12 stores: r(area, ad spend) = {stores['store_area_sqft'].corr(stores['ad_spend_inr']):.2f}, "
      f"r(area, revenue) = {stores['store_area_sqft'].corr(stores['revenue_inr']):.2f}")
```

## Output

### Step 1

```output
Rows, columns: (8772, 16)
```

### Step 2

```output
Covariance   : 186,656,844  (visitors x Rs)
r by formula : 0.9607
r by pandas  : 0.9607
```

### Step 3

```output
Covariance (revenue in Rs lakh): 1,866.57
r          (revenue in Rs lakh): 0.9607
```

### Step 4

```output
          area  ad_spend  discount  rain  footfall  bills  revenue
area      1.00      0.62     -0.01  0.00      0.81   0.79     0.89
ad_spend  0.62      1.00      0.02  0.00      0.59   0.57     0.61
discount -0.01      0.02      1.00 -0.01      0.14   0.21     0.09
rain      0.00      0.00     -0.01  1.00     -0.05  -0.05    -0.02
footfall  0.81      0.59      0.14 -0.05      1.00   0.99     0.96
bills     0.79      0.57      0.21 -0.05      0.99   1.00     0.96
revenue   0.89      0.61      0.09 -0.02      0.96   0.96     1.00
```

### Step 5

![Scatter plot of daily ad spend (x-axis, up to about 22,000 rupees) against daily revenue (y-axis, rupees lakh). Orange Express-store points form a dense low cluster below about 5 lakh revenue and 7,000 rupees ad spend; blue Supermarket points form a separate, higher and wider cloud. Within each colour the upward trend is weak](../../assets/img/prob-stats/correlation-practical-step5.png)

### Step 6

```output
Whole chain : r = 0.61
Express     : r = 0.16
Supermarket : r = 0.20

Within each store:
store_id
S01    0.25
S02    0.21
S03    0.29
S04    0.34
S05    0.25
S06    0.23
S07    0.33
S08    0.27
S09    0.26
S10    0.26
S11    0.33
S12    0.31
Median within-store r: 0.27
```

### Step 7

```output
                      store_area_sqft  ad_spend_inr  revenue_inr
store_id store_type                                             
S01      Supermarket             9000          6091      1076818
S02      Express                 2800          2498       347644
S03      Express                 2200          2407       158478
S04      Supermarket             8500          5984       953601
S05      Express                 3000          2372       320562
S06      Express                 2500          2379       191858
S07      Supermarket             7000          6111       597131
S08      Express                 2300          2375       159013
S09      Supermarket             6500          5905       538047
S10      Express                 2200          2352       144172
S11      Supermarket             7500          6133       671530
S12      Express                 2400          2292       169665

Across the 12 stores: r(area, ad spend) = 0.97, r(area, revenue) = 0.97
```

## Explanation

### Steps 2–3: the formula and its units

- The formula and pandas agree: $r = 0.9607$ between footfall and revenue. More visitors, more sales.
- The covariance is 186,656,844 visitors × ₹, a number with no intuitive size. Converting revenue to ₹ lakh divides it by 100,000 (to 1,866.57), but r stays 0.9607.
- ==Covariance depends on units; r does not.==

### Step 4: reading the matrix

| Pair | r | Reading |
|---|---|---|
| footfall – bills – revenue | 0.96–0.99 | Strong: they measure almost the same activity |
| area – revenue | 0.89 | Strong: bigger stores sell more |
| ad_spend – revenue | 0.61 | Moderate, but see Steps 5–7 |
| discount – bills | 0.21 | Weak positive |
| rain – anything | about 0 | Most days have no rain, which hides the monsoon effect |

The diagonal is always 1 (each variable with itself). pandas skips the 93 missing rainfall values pair by pair.

### Step 5: look before you trust r

The plot shows two separate clouds, not one rising line. Express stores sit low-left (small budgets, low sales); Supermarkets sit high-right. ==Separate clusters in a scatter plot warn that a group variable may be driving the correlation.==

### Step 6: chain versus within groups

- Whole chain: **0.61**. Within each store: **0.21 to 0.34, median 0.27**.
- Within a store type r is even lower (0.16, 0.20): stores of one type have almost the same ad budget (about ₹2,400 for every Express store) but very different sales (Thane ₹3.5 lakh, Nanded ₹1.4 lakh a day), which adds variation unrelated to ads.
- Ads do help (every within-store r is positive), but much less than 0.61 suggests.

### Step 7: the confounder

Across the 12 stores, floor area correlates 0.97 with average ad spend and 0.97 with average revenue. Every Supermarket spends about ₹6,000 a day on ads, every Express store about ₹2,400. Store size drives both variables, so it inflates the chain-wide r. The fair comparison is a store with itself on high-ad and low-ad days.

### Conclusion for the manager

Footfall is the strongest driver of revenue. Advertising has a real but modest link with revenue within a store (r ≈ 0.27, so $r^2 \approx 0.07$: about 7% of daily variation). Doubling the ad budget on the strength of r = 0.61 would be a mistake. Practical 8 measures how many rupees of revenue each extra rupee of ads brings.

## Try it

Does the discount relate to the number of bills more strongly in Supermarkets or in Express stores? Compute r between `discount_pct` and `transactions` for each store type, and then for S01 alone.

Start from: `df.groupby("store_type").apply(lambda g: g["discount_pct"].corr(g["transactions"]), include_groups=False)`

> [!answer]- Answer
> ```python
> print(df.groupby("store_type").apply(
>     lambda g: g["discount_pct"].corr(g["transactions"]), include_groups=False).round(2).to_string())
> s01 = df[df["store_id"] == "S01"]
> print("S01:", round(s01["discount_pct"].corr(s01["transactions"]), 2))
> ```
> ```output
> store_type
> Express        0.27
> Supermarket    0.35
> S01: 0.48
> ```
> Chain-wide the r is only 0.21 (Step 4); within store types it rises to 0.27 and 0.35, and within S01 to 0.48. Here store size *hides* the relationship instead of inflating it: discounts are spread evenly across stores, so mixing small and large stores only adds noise to the number of bills.

## Viva questions

1. Write the formula for Karl Pearson's correlation coefficient. Why does it have no units?
2. Why did the covariance change in Step 3 while r did not?
3. Why is the diagonal of a correlation matrix always 1?
4. Rainfall shows r ≈ 0 with footfall. Does that mean rain does not affect footfall? How would you check?
5. Ad spend and revenue have r = 0.61 for the chain but about 0.27 within stores. Explain the difference.
6. What is a confounder? Name the confounder in this practical and give the evidence.
7. Why should you draw a scatter plot before reporting r?
8. What does $r^2 = 0.07$ mean in words?

## Flashcards

pandas: correlation between two columns? :: df["a"].corr(df["b"])
pandas: correlation matrix? :: df[cols].corr()
pandas: covariance between two columns? :: df["a"].cov(df["b"])
How do you compute r within each group? :: df.groupby("group").apply(lambda g: g["a"].corr(g["b"]))
What does a scatter plot with separate clusters suggest? :: A group variable may be driving (confounding) the correlation
Ad spend vs revenue at Sahyadri Mart: chain vs within store? :: r ≈ 0.61 chain-wide, ≈ 0.27 within each store

## Sources

- pandas documentation: [DataFrame.corr](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.corr.html)
- Matplotlib documentation: [Axes.scatter](https://matplotlib.org/stable/api/_as_gen/matplotlib.axes.Axes.scatter.html)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
