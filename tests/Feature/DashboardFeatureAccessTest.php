<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\EventMember;
use App\Models\EventType;
use App\Models\OrganizationMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardFeatureAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_and_routes_follow_enabled_modules_and_member_permissions(): void
    {
        $owner = User::factory()->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);
        app(FoundationCatalogService::class)->seed();
        $birthday = EventType::query()->where('slug', 'birthday')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => 'Studio Célébration',
            'organization_type' => 'agency',
            'event_type_id' => $birthday->id,
            'event_name' => 'Anniversaire de Sarah',
            'starts_at' => '2027-04-10',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Villa Nova',
            'venue_address' => null,
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 80,
            'modules' => ['budget'],
        ]);
        $session = [
            'active_organization_id' => $result['organization']->id,
            'active_event_id' => $result['event']->id,
        ];

        $this->actingAs($owner)
            ->withSession($session)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('workspace.modules', fn ($modules) => collect($modules)->contains('guests')
                    && collect($modules)->contains('budget')
                    && ! collect($modules)->contains('stock')));
        $this->actingAs($owner)->withSession($session)->get('/guests')->assertOk();
        $this->actingAs($owner)->withSession($session)->get('/budget')->assertOk();
        $this->actingAs($owner)->withSession($session)->get('/inventory')->assertForbidden();

        $financialManager = User::factory()->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);
        $membership = OrganizationMember::query()->create([
            'organization_id' => $result['organization']->id,
            'user_id' => $financialManager->id,
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $eventMember = EventMember::query()->create([
            'event_id' => $result['event']->id,
            'organization_member_id' => $membership->id,
            'status' => 'active',
            'assigned_at' => now(),
        ]);
        $financialRole = Role::query()
            ->where('organization_id', $result['organization']->id)
            ->where('slug', 'financial_manager')
            ->firstOrFail();
        $eventMember->roles()->attach($financialRole);

        $this->actingAs($financialManager)->withSession($session)->get('/budget')->assertOk();
        $this->actingAs($financialManager)->withSession($session)->get('/guests')->assertForbidden();
    }
}
