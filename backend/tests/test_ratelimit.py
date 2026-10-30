from app.ratelimit import SlidingWindow


class Clock:
    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


def test_allows_up_to_limit_then_blocks():
    clock = Clock()
    rl = SlidingWindow(3, 60, clock)
    assert [rl.allow("a") for _ in range(4)] == [True, True, True, False]


def test_window_slides():
    clock = Clock()
    rl = SlidingWindow(1, 60, clock)
    assert rl.allow("a")
    assert not rl.allow("a")
    clock.t = 61
    assert rl.allow("a")


def test_keys_are_independent():
    rl = SlidingWindow(1, 60, Clock())
    assert rl.allow("a")
    assert rl.allow("b")
