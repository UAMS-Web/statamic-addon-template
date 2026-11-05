<?php

declare(strict_types=1);

it('fails on purpose for the caller probe', function (): void {
    expect(random_int(1, 1))->toBe(0);
});
