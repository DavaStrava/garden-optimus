import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionProvider } from "next-auth/react";

// Custom render function that wraps components with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
    expires: string;
  } | null;
}

const defaultSession = {
  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

function AllProviders({
  children,
  session = defaultSession,
}: {
  children: React.ReactNode;
  session?: CustomRenderOptions["session"];
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

function customRender(
  ui: ReactElement,
  { session, ...options }: CustomRenderOptions = {}
) {
  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllProviders session={session}>{children}</AllProviders>
      ),
      ...options,
    }),
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent };

// Override render with custom render
export { customRender as render };

// Helper to create mock plant data
export function createMockPlant(overrides = {}) {
  return {
    id: "plant-1",
    name: "Test Plant",
    nickname: null,
    speciesId: null,
    species: null,
    location: "INDOOR" as const,
    area: "Living Room",
    acquiredAt: new Date("2024-01-01"),
    notes: null,
    userId: "test-user-id",
    photos: [],
    careLogs: [],
    assessments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock species data
export function createMockSpecies(overrides = {}) {
  return {
    id: "species-1",
    commonName: "Monstera",
    scientificName: "Monstera deliciosa",
    lightNeeds: "Bright indirect light",
    waterFrequency: "Weekly",
    humidity: "High",
    temperature: "65-85°F",
    toxicity: "Toxic to pets",
    careNotes: "Loves humidity",
    imageUrl: null,
    ...overrides,
  };
}

// Helper to create mock care log data
export function createMockCareLog(overrides = {}) {
  return {
    id: "carelog-1",
    type: "WATERING" as const,
    plantId: "plant-1",
    amount: "200ml",
    notes: null,
    loggedAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock health assessment data
export function createMockAssessment(overrides = {}) {
  return {
    id: "assessment-1",
    plantId: "plant-1",
    photoUrl: "/uploads/test.jpg",
    healthStatus: "Healthy",
    issues: null,
    recommendations: "Keep up the good care!",
    rawResponse: "HEALTH STATUS: Healthy\nISSUES: No visible issues\nRECOMMENDATIONS: Keep up the good care!",
    assessedAt: new Date(),
    ...overrides,
  };
}
