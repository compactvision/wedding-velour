<?php

namespace App\Providers;

use App\Application\Common\CommandBus;
use App\Application\Common\QueryBus;
use App\Domain\Wedding\Repositories\GuestRepositoryInterface;
use App\Domain\Wedding\Repositories\MenuItemRepositoryInterface;
use App\Domain\Wedding\Repositories\OrderRepositoryInterface;
use App\Domain\Wedding\Repositories\PhotoRepositoryInterface;
use App\Domain\Wedding\Repositories\TimelineEventRepositoryInterface;
use App\Domain\Wedding\Repositories\WeddingNotificationRepositoryInterface;
use App\Domain\Wedding\Repositories\WeddingRepositoryInterface;
use App\Domain\Wedding\Repositories\WeddingTableRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentGuestRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentMenuItemRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentOrderRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentPhotoRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentTimelineEventRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentWeddingNotificationRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentWeddingRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentWeddingTableRepository;
use App\Models\Event;
use App\Models\Organization;
use App\Policies\EventPolicy;
use App\Policies\OrganizationPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(
            WeddingRepositoryInterface::class,
            EloquentWeddingRepository::class
        );
        $this->app->singleton(
            GuestRepositoryInterface::class,
            EloquentGuestRepository::class
        );
        $this->app->singleton(
            WeddingTableRepositoryInterface::class,
            EloquentWeddingTableRepository::class
        );
        $this->app->singleton(
            MenuItemRepositoryInterface::class,
            EloquentMenuItemRepository::class
        );
        $this->app->singleton(
            OrderRepositoryInterface::class,
            EloquentOrderRepository::class
        );
        $this->app->singleton(
            PhotoRepositoryInterface::class,
            EloquentPhotoRepository::class
        );
        $this->app->singleton(
            TimelineEventRepositoryInterface::class,
            EloquentTimelineEventRepository::class
        );
        $this->app->singleton(
            WeddingNotificationRepositoryInterface::class,
            EloquentWeddingNotificationRepository::class
        );

        $this->app->singleton(CommandBus::class);
        $this->app->singleton(QueryBus::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        Gate::policy(
            Organization::class,
            OrganizationPolicy::class,
        );
        Gate::policy(
            Event::class,
            EventPolicy::class,
        );
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
