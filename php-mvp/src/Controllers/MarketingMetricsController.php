<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\ClientRepository;
use App\Repositories\MarketingMetricsRepository;

final class MarketingMetricsController
{
    public function __construct(
        private readonly MarketingMetricsRepository $metrics,
        private readonly ClientRepository $clients,
    ) {
    }

    public function index(Request $request, array $context): void
    {
        $org = (int) $context['user']['organization_id'];
        $role = (string) ($context['user']['role'] ?? '');

        if ($role === 'cliente') {
            $uid = (int) ($context['user']['id'] ?? 0);
            $email = (string) ($context['user']['email'] ?? '');
            $client = $this->clients->findByUserId($uid)
                ?? $this->clients->findByOrganizationAndEmail($org, $email);
            if ($client === null) {
                Response::json(['data' => []]);
                return;
            }
            $items = $this->metrics->allByOrganizationAndClient($org, (int) $client['id']);
            Response::json(['data' => $items]);
            return;
        }

        $q = $request->query ?? [];
        $clientId = isset($q['client_id']) ? (int) $q['client_id'] : 0;
        $period = isset($q['period']) ? trim((string) $q['period']) : '';

        if ($clientId > 0 && $period !== '') {
            $row = $this->metrics->findByOrgClientPeriod($org, $clientId, $period);
            Response::json(['data' => $row]);
            return;
        }

        if ($clientId > 0) {
            $items = $this->metrics->allByOrganizationAndClient($org, $clientId);
            Response::json(['data' => $items]);
            return;
        }

        $items = $this->metrics->allByOrganization($org);
        Response::json(['data' => $items]);
    }

    public function upsert(Request $request, array $context): void
    {
        $payload = $request->body;
        $clientId = (int) ($payload['client_id'] ?? 0);
        $period = trim((string) ($payload['period_label'] ?? ''));

        if ($clientId <= 0 || $period === '') {
            Response::json(['error' => 'validation_error', 'message' => 'client_id e period_label são obrigatórios'], 422);
        }

        $org = (int) $context['user']['organization_id'];
        $client = $this->clients->findByOrganizationAndId($org, $clientId);
        if ($client === null) {
            Response::json(['error' => 'validation_error', 'message' => 'client_id inválido'], 422);
        }

        $row = $this->buildMetricRow($payload, $clientId, $period);
        $existing = $this->metrics->findByOrgClientPeriod($org, $clientId, $period);

        if ($existing !== null) {
            $metricsOnly = $this->metricFieldsOnly($row);
            $this->metrics->updateRow((int) $existing['id'], $org, $metricsOnly);
            Response::json(['message' => 'Métricas atualizadas', 'id' => (int) $existing['id']]);
            return;
        }

        $id = $this->metrics->insert($org, $row);
        Response::json(['message' => 'Métricas salvas', 'id' => $id], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildMetricRow(array $body, int $clientId, string $periodLabel): array
    {
        $s = static function (array $b, string $key, float $default = 0.0): float {
            if (!isset($b[$key])) {
                return $default;
            }
            return is_numeric($b[$key]) ? (float) $b[$key] : $default;
        };
        $i = static function (array $b, string $key, int $default = 0): int {
            if (!isset($b[$key])) {
                return $default;
            }
            return (int) $b[$key];
        };
        $t = static function (array $b, string $key): ?string {
            if (!isset($b[$key])) {
                return null;
            }
            $v = trim((string) $b[$key]);
            return $v === '' ? null : $v;
        };

        return [
            'client_id' => $clientId,
            'period_label' => $periodLabel,
            'meta_account_id' => $t($body, 'meta_account_id'),
            'meta_account_name' => $t($body, 'meta_account_name'),
            'meta_spend' => $s($body, 'meta_spend', 0),
            'meta_leads' => $i($body, 'meta_leads', 0),
            'meta_conversions' => $i($body, 'meta_conversions', 0),
            'google_account_id' => $t($body, 'google_account_id'),
            'google_account_name' => $t($body, 'google_account_name'),
            'google_spend' => $s($body, 'google_spend', 0),
            'google_leads' => $i($body, 'google_leads', 0),
            'google_conversions' => $i($body, 'google_conversions', 0),
            'organic_spend' => $s($body, 'organic_spend', 0),
            'organic_leads' => $i($body, 'organic_leads', 0),
            'organic_conversions' => $i($body, 'organic_conversions', 0),
            'outros_spend' => $s($body, 'outros_spend', 0),
            'outros_leads' => $i($body, 'outros_leads', 0),
            'outros_conversions' => $i($body, 'outros_conversions', 0),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function metricFieldsOnly(array $row): array
    {
        unset($row['client_id'], $row['period_label']);

        return $row;
    }
}
