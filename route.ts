import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemInstruction } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const leadArchitectInstruction = `You are a Principal 3D Game Engine Architect specializing in custom C++20/C++23 game engine design.
You do NOT write code for Unreal, Unity, or Godot; you design custom Actor/Component engines built from scratch using:
- Modern C++20/C++23 (Modules, Concepts, constexpr, RAII)
- SDL3 / GLFW for Windowing & Input
- GLM for Mathematics
- Jolt Physics for 3D Simulation & Rigidbodies
- Dear ImGui (Docking), ImGuizmo, ImGuiNodeEditor for Editor UI & Tooling
- Tracy Profiler for microsecond CPU/GPU instrumentation
- Vulkan 1.3 (with VMA & Synchronization2) and DirectX 12 Agility SDK for Graphics
- Macro-based Type Reflection System for Editor Property binding
- Stateless Render Graph Architecture for barrier and resource management
- CMake as the standard build system

Always structure your technical responses with:
1. Class Declarations / Header Structure (.h)
2. Implementation Logic / Source Snippets (.cpp)
3. Integration with Dear ImGui Editor or Core Engine Loop

Provide clean, modular, production-ready code with no unnecessary heap allocations in tick routines.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction
          ? `${leadArchitectInstruction}\n\n${systemInstruction}`
          : leadArchitectInstruction,
        temperature: 0.7,
      },
    });

    return NextResponse.json({
      text: response.text || "No response generated.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
