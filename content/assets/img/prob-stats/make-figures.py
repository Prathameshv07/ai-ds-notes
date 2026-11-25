"""Draws the static figures used by prob-stats theory notes.
Run from this folder: python make-figures.py   (needs numpy and matplotlib; seed fixed)."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
BLUE, ORANGE, GREEN, GREY = "#2563eb", "#ea580c", "#16a34a", "#6b7280"


def skewness_shapes():
    x = np.linspace(0, 10, 2001)
    right = x * np.exp(-x)                         # gamma(2): mode 1, mean 2
    cdf = np.cumsum(right) / right.sum()
    med = x[np.searchsorted(cdf, 0.5)]
    fig, axes = plt.subplots(1, 3, figsize=(10, 3))
    panels = [
        ("Negative (left) skew", 10 - x, right, (10 - 2, 10 - med, 10 - 1)),
        ("Symmetric", x, np.exp(-(x - 5) ** 2 / 2), (5, 5, 5)),
        ("Positive (right) skew", x, right, (2, med, 1)),
    ]
    for ax, (title, xs, ys, (mean, median, mode)) in zip(axes, panels):
        ax.plot(xs, ys / ys.max(), color=BLUE, lw=2)
        ax.fill_between(xs, ys / ys.max(), color=BLUE, alpha=0.12)
        if mean == median == mode:
            ax.axvline(mean, color=GREY, ls="--")
            ax.text(mean, 1.05, "mean = median = mode", ha="center", fontsize=8)
        else:
            for v, lab, c in [(mode, "mode", GREEN), (median, "median", ORANGE), (mean, "mean", "black")]:
                ax.axvline(v, color=c, ls="--", lw=1.3, label=lab)
            ax.legend(frameon=False, fontsize=8, loc="upper left" if mean < mode else "upper right")
        ax.set_title(title, pad=18)
        ax.set_xlim(0, 10); ax.set_ylim(0, 1.15); ax.set_yticks([]); ax.set_xticks([])
    fig.tight_layout()
    fig.savefig("skewness-shapes.png", dpi=110)


def kurtosis_shapes():
    x = np.linspace(-4, 4, 1601)
    normal = np.exp(-x ** 2 / 2) / np.sqrt(2 * np.pi)
    b = 1 / np.sqrt(2)                            # Laplace with SD 1
    laplace = np.exp(-np.abs(x) / b) / (2 * b)
    a = np.sqrt(3)                                # uniform with SD 1
    uniform = np.where(np.abs(x) <= a, 1 / (2 * a), 0)
    fig, ax = plt.subplots(figsize=(6.5, 3.2))
    ax.plot(x, laplace, color=ORANGE, lw=2, label="Leptokurtic: peaked, heavy tails (β₂ > 3)")
    ax.plot(x, normal, color=BLUE, lw=2, label="Mesokurtic: normal (β₂ = 3)")
    ax.plot(x, uniform, color=GREEN, lw=2, label="Platykurtic: flat, light tails (β₂ < 3)")
    ax.set_yticks([]); ax.set_xlabel("All three curves have mean 0 and SD 1")
    ax.legend(frameon=False, fontsize=8, loc="upper right")
    fig.tight_layout()
    fig.savefig("kurtosis-shapes.png", dpi=110)


def scatter_patterns():
    rng = np.random.default_rng(2026)
    n = 80
    fig, axes = plt.subplots(2, 3, figsize=(9, 5.6))
    for ax, rho in zip(axes.flat[:5], [0.9, 0.5, 0.0, -0.5, -0.9]):
        x = rng.normal(size=n)
        y = rho * x + np.sqrt(1 - rho ** 2) * rng.normal(size=n)
        ax.scatter(x, y, s=12, color=BLUE, alpha=0.7)
        ax.set_title(f"r = {np.corrcoef(x, y)[0, 1]:.2f}")
    x = rng.uniform(-2, 2, n)
    y = x ** 2 + 0.3 * rng.normal(size=n)
    ax = axes.flat[5]
    ax.scatter(x, y, s=12, color=ORANGE, alpha=0.7)
    ax.set_title(f"U-shape: r = {np.corrcoef(x, y)[0, 1]:.2f}")
    for ax in axes.flat:
        ax.set_xticks([]); ax.set_yticks([])
    fig.tight_layout()
    fig.savefig("scatter-patterns.png", dpi=110)


def continuous_distributions():
    fig, axes = plt.subplots(1, 3, figsize=(10, 3))
    # Uniform(0, 20): P(X > 15)
    ax = axes[0]
    ax.plot([0, 0, 20, 20], [0, 0.05, 0.05, 0], color=BLUE, lw=2)
    ax.fill_between([15, 20], [0.05, 0.05], color=ORANGE, alpha=0.5)
    ax.set_title("Uniform, 0 to 20\nP(X > 15) = 0.25")
    ax.set_xlim(-2, 22); ax.set_ylim(0, 0.07)
    # Exponential, mean 2: P(X > 3)
    ax = axes[1]
    x = np.linspace(0, 10, 500); lam = 0.5; y = lam * np.exp(-lam * x)
    ax.plot(x, y, color=BLUE, lw=2)
    ax.fill_between(x[x >= 3], y[x >= 3], color=ORANGE, alpha=0.5)
    ax.set_title(f"Exponential, mean 2\nP(X > 3) = {np.exp(-1.5):.2f}")
    # Normal(30, 5): P(X > 40)
    ax = axes[2]
    x = np.linspace(10, 50, 500); y = np.exp(-((x - 30) / 5) ** 2 / 2)
    ax.plot(x, y, color=BLUE, lw=2)
    ax.fill_between(x[x >= 40], y[x >= 40], color=ORANGE, alpha=0.5)
    ax.set_title("Normal, mean 30, SD 5\nP(X > 40) = 0.02")
    for ax in axes:
        ax.set_yticks([])
    fig.tight_layout()
    fig.savefig("continuous-distributions.png", dpi=110)


def normal_empirical_rule():
    x = np.linspace(-4, 4, 800); y = np.exp(-x ** 2 / 2)
    fig, ax = plt.subplots(figsize=(7, 3.2))
    for k, c, a in [(3, GREEN, 0.18), (2, ORANGE, 0.25), (1, BLUE, 0.35)]:
        m = np.abs(x) <= k
        ax.fill_between(x[m], y[m], color=c, alpha=a)
    ax.plot(x, y, color="black", lw=1.5)
    for k, lab, h in [(1, "68%", 0.55), (2, "95%", 0.32), (3, "99.7%", 0.12)]:
        ax.annotate("", xy=(-k, h), xytext=(k, h), arrowprops=dict(arrowstyle="<->", color=GREY))
        ax.text(0, h + 0.03, lab, ha="center", fontsize=10)
    ax.set_xticks(range(-3, 4))
    ax.set_xticklabels(["μ − 3σ", "μ − 2σ", "μ − σ", "μ", "μ + σ", "μ + 2σ", "μ + 3σ"])
    ax.set_yticks([]); ax.set_ylim(0, 1.08)
    fig.tight_layout()
    fig.savefig("normal-empirical-rule.png", dpi=110)


def clt_demo():
    rng = np.random.default_rng(2026)
    pop = rng.exponential(scale=550, size=200_000)        # right-skewed "bill amounts", mean about 550
    fig, axes = plt.subplots(1, 4, figsize=(11, 2.8))
    axes[0].hist(pop, bins=60, range=(0, 2500), color=GREY)
    axes[0].set_title("Population of bills\n(right-skewed)")
    for ax, n in zip(axes[1:], [2, 5, 30]):
        means = rng.choice(pop, size=(20_000, n)).mean(axis=1)
        ax.hist(means, bins=60, range=(0, 1500), color=BLUE)
        ax.set_title(f"Means of samples of {n}")
    for ax in axes:
        ax.set_yticks([])
        ax.axvline(pop.mean(), color=ORANGE, ls="--", lw=1.2)
    fig.tight_layout()
    fig.savefig("clt-demo.png", dpi=110)


skewness_shapes()
kurtosis_shapes()
scatter_patterns()
continuous_distributions()
normal_empirical_rule()
clt_demo()
