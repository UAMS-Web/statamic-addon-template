<?php

declare(strict_types=1);

it("fails on purpose for the caller probe", function (): void {
    expect(true)->toBeFalse();
});
