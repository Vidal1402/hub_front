<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class ClientRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function allByOrganization(int $organizationId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM clients WHERE organization_id = :org ORDER BY id DESC');
        $stmt->execute(['org' => $organizationId]);
        return $stmt->fetchAll() ?: [];
    }

    public function create(array $payload, int $organizationId): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO clients (name, empresa, email, telefone, plano, valor, status, organization_id)
             VALUES (:name, :empresa, :email, :telefone, :plano, :valor, :status, :organization_id)'
        );
        $stmt->execute([
            'name' => $payload['name'],
            'empresa' => $payload['empresa'],
            'email' => $payload['email'],
            'telefone' => $payload['telefone'] ?? null,
            'plano' => $payload['plano'] ?? 'Growth',
            'valor' => $payload['valor'] ?? 0,
            'status' => $payload['status'] ?? 'ativo',
            'organization_id' => $organizationId,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByOrganizationAndId(int $organizationId, int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM clients WHERE organization_id = :org AND id = :id LIMIT 1');
        $stmt->execute(['org' => $organizationId, 'id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByUserId(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM clients WHERE user_id = :uid LIMIT 1');
        $stmt->execute(['uid' => $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByOrganizationAndEmail(int $organizationId, string $email): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM clients WHERE organization_id = :org AND lower(trim(email)) = lower(trim(:email)) LIMIT 1'
        );
        $stmt->execute(['org' => $organizationId, 'email' => $email]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /**
     * @param array{name?:string, empresa?:string, email?:string, telefone?:string|null, plano?:string, valor?:float|int, status?:string} $payload
     */
    public function updateForOrganization(int $organizationId, int $id, array $payload): bool
    {
        $current = $this->findByOrganizationAndId($organizationId, $id);
        if ($current === null) {
            return false;
        }

        $merged = array_merge($current, $payload);
        $stmt = $this->pdo->prepare(
            'UPDATE clients SET name = :name, empresa = :empresa, email = :email, telefone = :telefone,
             plano = :plano, valor = :valor, status = :status, user_id = :user_id
             WHERE organization_id = :organization_id AND id = :id'
        );
        $stmt->execute([
            'name' => $merged['name'],
            'empresa' => $merged['empresa'],
            'email' => $merged['email'],
            'telefone' => $merged['telefone'] ?? null,
            'plano' => $merged['plano'] ?? 'Growth',
            'valor' => $merged['valor'] ?? 0,
            'status' => $merged['status'] ?? 'ativo',
            'user_id' => $merged['user_id'] ?? null,
            'organization_id' => $organizationId,
            'id' => $id,
        ]);

        return true;
    }

    public function deleteForOrganization(int $organizationId, int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM clients WHERE organization_id = :org AND id = :id');
        $stmt->execute(['org' => $organizationId, 'id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
