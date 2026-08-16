import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Vanguard Engine Architect | Custom 3D C++23 Engine & Editor',
  description: 'Custom 3D game engine and editor design studio with macro reflection, Vulkan 1.3 stateless render graph, Jolt physics, and Dear ImGui.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
