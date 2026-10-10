"""
BreakoutStrategy — esempio didattico (BTC/ETH, 1h) per Freqtrade.

Long sul breakout del massimo di Donchian a N barre, con filtro di trend
(EMA 200) e di volume. Uscita sulla rottura del minimo a M barre o tramite
stoploss/ROI. NON è una raccomandazione: serve solo a provare il flusso
backtest -> dry-run descritto in trading-bots/README.md.
"""
from pandas import DataFrame

import talib.abstract as ta
from freqtrade.strategy import IStrategy, IntParameter


class BreakoutStrategy(IStrategy):
    INTERFACE_VERSION = 3

    timeframe = "1h"
    can_short = False
    startup_candle_count = 200

    minimal_roi = {"0": 0.10, "720": 0.05, "1440": 0.02}
    stoploss = -0.04
    trailing_stop = True
    trailing_stop_positive = 0.02
    trailing_stop_positive_offset = 0.04
    trailing_only_offset_is_reached = True

    # Ottimizzabili con `freqtrade hyperopt --spaces buy sell`
    entry_window = IntParameter(10, 60, default=24, space="buy")
    exit_window = IntParameter(5, 30, default=12, space="sell")

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)
        dataframe["vol_ma"] = dataframe["volume"].rolling(20).mean()
        for n in self.entry_window.range:
            dataframe[f"dc_high_{n}"] = dataframe["high"].rolling(n).max().shift(1)
        for n in self.exit_window.range:
            dataframe[f"dc_low_{n}"] = dataframe["low"].rolling(n).min().shift(1)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] > dataframe[f"dc_high_{self.entry_window.value}"])
            & (dataframe["close"] > dataframe["ema200"])
            & (dataframe["volume"] > dataframe["vol_ma"])
            & (dataframe["volume"] > 0),
            ["enter_long", "enter_tag"],
        ] = (1, "donchian_breakout")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["close"] < dataframe[f"dc_low_{self.exit_window.value}"])
            & (dataframe["volume"] > 0),
            ["exit_long", "exit_tag"],
        ] = (1, "donchian_breakdown")
        return dataframe
