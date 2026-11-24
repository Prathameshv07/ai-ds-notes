"""Generate sahyadri-mart-sales.csv: daily sales of a fictional Maharashtra store chain.

Synthetic data for teaching (NOTES_PROJECT_PLAN.md Section 7.4a). The data card,
sahyadri-mart-sales.md, documents every column. Run from any folder:

    python sahyadri-mart-sales.py

The random seed is fixed, so the CSV is identical on every run. Change a rule below
only together with the data card, because practicals quote numbers from this file.
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 2026
START, END = "2024-01-01", "2025-12-31"
OUT = Path(__file__).with_suffix(".csv")

# store_id, city, region, store_type, area_sqft, base daily footfall, average bill (Rs)
STORES = [
    ("S01", "Mumbai", "Mumbai-Konkan", "Supermarket", 9000, 1500, 780),
    ("S02", "Thane", "Mumbai-Konkan", "Express", 2800, 900, 420),
    ("S03", "Ratnagiri", "Mumbai-Konkan", "Express", 2200, 480, 360),
    ("S04", "Pune", "Western Maharashtra", "Supermarket", 8500, 1400, 740),
    ("S05", "Pune", "Western Maharashtra", "Express", 3000, 850, 410),
    ("S06", "Kolhapur", "Western Maharashtra", "Express", 2500, 560, 370),
    ("S07", "Nashik", "North Maharashtra", "Supermarket", 7000, 1000, 640),
    ("S08", "Jalgaon", "North Maharashtra", "Express", 2300, 500, 340),
    ("S09", "Chhatrapati Sambhajinagar", "Marathwada", "Supermarket", 6500, 950, 610),
    ("S10", "Nanded", "Marathwada", "Express", 2200, 470, 330),
    ("S11", "Nagpur", "Vidarbha", "Supermarket", 7500, 1100, 660),
    ("S12", "Amravati", "Vidarbha", "Express", 2400, 520, 350),
]

# Main festival days (shopping peaks in the days before them).
FESTIVALS = {
    "2024-04-09": "Gudi Padwa", "2024-09-07": "Ganesh Chaturthi", "2024-10-12": "Dussehra",
    "2024-11-01": "Diwali", "2025-03-30": "Gudi Padwa", "2025-08-27": "Ganesh Chaturthi",
    "2025-10-02": "Dussehra", "2025-10-21": "Diwali",
}
FESTIVAL_LIFT = {"Gudi Padwa": 0.25, "Ganesh Chaturthi": 0.35, "Dussehra": 0.30, "Diwali": 0.60}

WEEKDAY_FACTOR = {"Monday": 0.92, "Tuesday": 0.90, "Wednesday": 0.93, "Thursday": 0.95,
                  "Friday": 1.02, "Saturday": 1.15, "Sunday": 1.20}
MONTH_FACTOR = {1: 0.97, 2: 0.95, 3: 1.00, 4: 1.00, 5: 1.03, 6: 0.97, 7: 0.92, 8: 0.94,
                9: 1.00, 10: 1.08, 11: 1.10, 12: 1.04}
# Average monsoon-day rainfall (mm) by region; June to September only.
MONSOON_RAIN = {"Mumbai-Konkan": 28, "Western Maharashtra": 12, "North Maharashtra": 8,
                "Marathwada": 6, "Vidarbha": 10}


def festival_lift(dates):
    """Lift in footfall: full lift on the festival day, smaller lifts on the 3 days before."""
    lift = np.zeros(len(dates))
    flag = np.zeros(len(dates), dtype=int)
    for day, name in FESTIVALS.items():
        d = pd.Timestamp(day)
        for back, share in [(0, 1.0), (1, 0.8), (2, 0.5), (3, 0.3)]:
            hit = dates == d - pd.Timedelta(days=back)
            lift[hit] = np.maximum(lift[hit], FESTIVAL_LIFT[name] * share)
            flag[hit] = 1
    return lift, flag


def main():
    rng = np.random.default_rng(SEED)
    dates = pd.date_range(START, END, freq="D")
    lift, is_festival = festival_lift(dates)
    years_in = (dates - dates[0]).days / 365.25
    rows = []

    for sid, city, region, stype, area, base_ff, base_bill in STORES:
        n = len(dates)
        weekday = dates.day_name()
        month = dates.month

        # Rain: monsoon months only, heavier in Konkan; mostly dry days otherwise.
        monsoon = month.isin([6, 7, 8, 9])
        wet = rng.random(n) < np.where(monsoon, 0.75, 0.04)
        rain = np.where(wet, rng.gamma(1.2, np.where(monsoon, MONSOON_RAIN[region], 4) / 1.2), 0.0)
        rain = np.round(rain, 1)

        # Marketing levers, decided by the store each day.
        discount = rng.choice([0, 5, 10, 15], size=n, p=[0.55, 0.20, 0.15, 0.10])
        discount = np.where(is_festival == 1, np.maximum(discount, 10), discount)
        display = (rng.random(n) < 0.30).astype(int)  # promotional end-cap display
        ad_scale = 1.0 if stype == "Supermarket" else 0.4
        ad_spend = np.round(rng.gamma(4.0, 1500 * ad_scale, n) * (1 + 0.8 * lift), -1)

        # Footfall: base x growth x weekday x month x festival x rain x levers x noise.
        growth = 1 + 0.08 * years_in
        rain_effect = 1 - 0.20 * (1 - np.exp(-rain / 40))
        ad_effect = 1 + 0.15 * np.log1p(ad_spend / (1000 * ad_scale))
        lever = 1 + 0.010 * discount + 0.04 * display + 0.03 * display * (discount > 0)
        mean_ff = (base_ff * growth * weekday.map(WEEKDAY_FACTOR).to_numpy()
                   * month.map(MONTH_FACTOR).to_numpy() * (1 + lift)
                   * rain_effect * ad_effect * lever)
        footfall = rng.poisson(mean_ff * rng.lognormal(0, 0.08, n))

        # Buyers among visitors, and what they spend.
        conversion = np.clip(0.62 + 0.004 * discount + rng.normal(0, 0.03, n), 0.4, 0.9)
        transactions = rng.binomial(footfall, conversion)
        avg_bill = base_bill * (1 + 0.35 * lift) * (1 - 0.006 * discount) * rng.lognormal(0, 0.06, n)
        revenue = np.round(transactions * avg_bill, -1)
        units = rng.poisson(transactions * (3.8 if stype == "Supermarket" else 2.6))

        rows.append(pd.DataFrame({
            "date": dates.strftime("%Y-%m-%d"), "day_of_week": weekday,
            "store_id": sid, "city": city, "region": region, "store_type": stype,
            "store_area_sqft": area, "is_festival": is_festival, "discount_pct": discount,
            "display": display, "ad_spend_inr": ad_spend.astype(int), "rainfall_mm": rain,
            "footfall": footfall, "transactions": transactions, "units_sold": units,
            "revenue_inr": revenue.astype(int),
        }))

    df = pd.concat(rows, ignore_index=True)

    # Real records are imperfect: the rain gauge at two stores failed on some days.
    gauge_down = df["store_id"].isin(["S03", "S10"]) & (rng.random(len(df)) < 0.06)
    df.loc[gauge_down, "rainfall_mm"] = np.nan

    df.to_csv(OUT, index=False)
    print(f"Wrote {OUT.name}: {len(df):,} rows, {OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
