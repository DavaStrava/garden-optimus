import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@/test/utils";
import { AIIdentifyButton } from "./ai-identify-button";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL methods
const mockObjectURL = "blob:http://localhost/mock-preview-url";
global.URL.createObjectURL = vi.fn(() => mockObjectURL);
global.URL.revokeObjectURL = vi.fn();

// Mock image-compression module
vi.mock("@/lib/image-compression", () => ({
  validateImageFileAsync: vi.fn(() => Promise.resolve({ valid: true })),
  compressImage: vi.fn((file) => Promise.resolve(file)),
  createImagePreview: vi.fn(() => mockObjectURL),
  revokeImagePreview: vi.fn(),
}));

import { validateImageFileAsync, compressImage } from "@/lib/image-compression";

const mockIdentificationResponse = {
  identification: {
    species: "Monstera",
    scientificName: "Monstera deliciosa",
    confidence: "high",
    reasoning: "Identified by large split leaves",
  },
  matches: [
    {
      id: "1",
      commonName: "Monstera",
      scientificName: "Monstera deliciosa",
      lightNeeds: "Bright indirect light",
      matchConfidence: "high",
      suitableFor: ["INDOOR"],
    },
  ],
};

// Helper to create mock File
function createMockFile(name: string, type: string, size = 1024): File {
  const content = new Array(size).fill("a").join("");
  return new File([content], name, { type });
}

describe("AIIdentifyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockIdentificationResponse),
    });
    (validateImageFileAsync as ReturnType<typeof vi.fn>).mockResolvedValue({ valid: true });
    (compressImage as ReturnType<typeof vi.fn>).mockImplementation((file) =>
      Promise.resolve(file)
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("rendering", () => {
    it("should render the button with AI identify text", () => {
      render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      expect(screen.getByText("Identify with AI")).toBeInTheDocument();
    });

    it("should render with mobile-friendly short text", () => {
      render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      expect(screen.getByText("AI ID")).toBeInTheDocument();
    });

    it("should have sparkles icon", () => {
      const { container } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      // Check for SVG (lucide icon)
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("dialog opening", () => {
    it("should open dialog when button is clicked", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      expect(screen.getByText("AI Plant Identification")).toBeInTheDocument();
    });

    it("should show upload instructions in dialog", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      expect(screen.getByText("Drop an image here")).toBeInTheDocument();
      expect(screen.getByText("or use the buttons below")).toBeInTheDocument();
    });

    it("should show Take Photo and Upload File buttons", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      expect(screen.getByText("Take Photo")).toBeInTheDocument();
      expect(screen.getByText("Upload File")).toBeInTheDocument();
    });

    it("should show supported formats info", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      expect(screen.getByText(/Supported formats: JPEG, PNG, WebP/)).toBeInTheDocument();
    });
  });

  describe("file validation", () => {
    it("should show error for invalid file type", async () => {
      (validateImageFileAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
        error: "Invalid file type",
      });

      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      // Get the file upload input (not the camera one with capture attribute)
      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.gif", "image/gif");

      // Use fireEvent.change since user.upload may not trigger handlers properly in some cases
      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText("Invalid file type")).toBeInTheDocument();
      });
    });
  });

  describe("identification flow", () => {
    it("should show Identify Plant button after file selection", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
    });

    it("should show loading state during identification", async () => {
      // Delay the API response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockIdentificationResponse),
                }),
              100
            )
          )
      );

      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Now click "Identify Plant" button to start identification
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Identifying your plant...")).toBeInTheDocument();
      });
    });

    it("should show results after successful identification", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Select Matching Species")).toBeInTheDocument();
      });
    });

    it("should call onSpeciesSelect when a match is selected", async () => {
      const onSpeciesSelect = vi.fn();
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={onSpeciesSelect} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Select Matching Species")).toBeInTheDocument();
      });

      // Click on the match - look for the common name in results
      const matchButtons = screen.getAllByRole("button");
      const monsteraButton = matchButtons.find((btn) =>
        btn.textContent?.includes("Monstera")
      );
      if (monsteraButton) {
        await user.click(monsteraButton);
      }

      expect(onSpeciesSelect).toHaveBeenCalled();
    });

    it("should call onSkip when skip button is clicked", async () => {
      const onSkip = vi.fn();
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={onSkip} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Select Matching Species")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Skip - Select species manually"));

      expect(onSkip).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should show error message on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Identification failed" }),
      });

      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Identification failed")).toBeInTheDocument();
      });
    });

    it("should show error on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show compression error", async () => {
      (compressImage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Compression failed")
      );

      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Compression failed")).toBeInTheDocument();
      });
    });
  });

  describe("dialog closing", () => {
    it("should close dialog after selection", async () => {
      const onSpeciesSelect = vi.fn();
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={onSpeciesSelect} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Select Matching Species")).toBeInTheDocument();
      });

      // Click on the match
      const matchButtons = screen.getAllByRole("button");
      const monsteraButton = matchButtons.find((btn) =>
        btn.textContent?.includes("Monstera") && !btn.textContent?.includes("Skip")
      );
      if (monsteraButton) {
        await user.click(monsteraButton);
      }

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText("AI Plant Identification")).not.toBeInTheDocument();
      });
    });

    it("should close dialog after skip", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      // Click "Identify Plant" button
      await waitFor(() => {
        expect(screen.getByText("Identify Plant")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Identify Plant"));

      await waitFor(() => {
        expect(screen.getByText("Select Matching Species")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Skip - Select species manually"));

      await waitFor(() => {
        expect(screen.queryByText("AI Plant Identification")).not.toBeInTheDocument();
      });
    });
  });

  describe("preview image", () => {
    it("should show preview image after file selection", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      const fileInput = document.querySelector(
        'input[type="file"]:not([capture])'
      ) as HTMLInputElement;
      const file = createMockFile("test.jpg", "image/jpeg");

      await user.upload(fileInput, file);

      await waitFor(() => {
        // Image preview should appear after file selection
        const previewImg = document.querySelector('img[src="' + mockObjectURL + '"]');
        expect(previewImg).toBeInTheDocument();
      });
    });
  });

  describe("drag and drop", () => {
    it("should have drop zone", async () => {
      const { user } = render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      await user.click(screen.getByText("Identify with AI"));

      expect(screen.getByText("Drop an image here")).toBeInTheDocument();
    });
  });

  describe("button type", () => {
    it("should have type=button to prevent form submission", () => {
      render(
        <AIIdentifyButton onSpeciesSelect={vi.fn()} onSkip={vi.fn()} />
      );

      const button = screen.getByRole("button", { name: /identify/i });
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
