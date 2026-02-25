# Third-Party Licenses

## QuantStats

This project uses QuantStats as its core analytics engine via the backend service.

- **Library**: QuantStats v0.0.81
- **Author**: Ran Aroussi
- **License**: Apache License 2.0
- **Repository**: https://github.com/ranaroussi/quantstats
- **PyPI**: https://pypi.org/project/QuantStats/

The backend imports QuantStats as a Python library dependency and calls its functions
at runtime for portfolio analytics computation (metrics, statistics, tearsheet reports).
No QuantStats source files have been modified.

The backend includes a metrics override that calls QuantStats' own `qs.stats.*` functions
on single-Series inputs instead of multi-column DataFrames to avoid cross-column data loss
from internal `dropna()` behavior when comparing multiple securities. This workaround calls
the same QuantStats functions — it does not modify the library's source code.

QREP is an independent project. It is not affiliated with or endorsed by the QuantStats
project or its authors.

## yfinance

Price data is fetched via the yfinance library on the backend.

- **Library**: yfinance
- **Author**: Ran Aroussi
- **License**: Apache License 2.0
- **Repository**: https://github.com/ranaroussi/yfinance

## Yahoo Finance

Market data displayed in this application is sourced from Yahoo Finance.
Yahoo Finance is a trademark of Yahoo Inc. QREP is not affiliated with Yahoo Inc.
