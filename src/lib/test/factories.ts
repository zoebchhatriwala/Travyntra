import { faker } from '@faker-js/faker';
import {
    Company,
    User,
    TripRequest,
    ApprovalWorkflow,
    WorkflowStep,
    RequestApprovalStep,
    UserApproval,
    UserRole,
    CompanyType,
    CompanyStatus,
    SubscriptionPlan,
    RequestStatus,
    ApprovalType,
    ApprovalStatus,
    WorkflowStepKind
} from '@prisma/client';

export const createMockCompany = (overrides?: Record<string, unknown>): Company => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    domain: faker.internet.domainName(),
    type: CompanyType.ENTERPRISE,
    status: CompanyStatus.ACTIVE,
    plan: SubscriptionPlan.FREE,
    subscriptionExpiresAt: null,
    logoUrl: faker.image.url(),
    currency: 'USD',
    timezone: 'UTC',
    country: 'US',
    policyThreshold: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockUser = (overrides?: Record<string, unknown>): User => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: 'hashed-password',
    role: UserRole.EMPLOYEE,
    avatarUrl: faker.image.avatar(),
    companyId: faker.string.uuid(),
    isActive: true,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockTripRequest = (overrides?: Record<string, unknown>): TripRequest => ({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    companyId: faker.string.uuid(),
    agencyId: null,
    status: RequestStatus.DRAFT,
    title: faker.lorem.sentence(),
    destination: { city: faker.location.city(), country: faker.location.country() },
    startDate: faker.date.future(),
    endDate: faker.date.future(),
    purpose: faker.lorem.paragraph(),
    budget: { amount: 1000, currencyCode: 'USD', multiplier: 1 },
    cost: null,
    preferences: {},
    parentTripId: null,
    isGroup: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockWorkflow = (overrides?: Record<string, unknown>): ApprovalWorkflow => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName() + ' Workflow',
    companyId: faker.string.uuid(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockWorkflowStep = (overrides?: Record<string, unknown>): WorkflowStep => ({
    id: faker.string.uuid(),
    workflowId: faker.string.uuid(),
    name: faker.lorem.words(2),
    order: 0,
    type: ApprovalType.ANY,
    kind: WorkflowStepKind.INTERNAL_APPROVAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

export const createMockRequestApprovalStep = (overrides?: Record<string, unknown>): RequestApprovalStep => ({
    id: faker.string.uuid(),
    requestId: faker.string.uuid(),
    stepId: faker.string.uuid(),
    status: ApprovalStatus.PENDING,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const createMockUserApproval = (overrides?: Record<string, unknown>): UserApproval => ({
    id: faker.string.uuid(),
    requestApprovalStepId: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: ApprovalStatus.PENDING,
    comment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});
