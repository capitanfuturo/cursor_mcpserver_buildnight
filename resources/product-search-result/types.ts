import { z } from "zod";

export const propSchema = z.object({
  title: z.string().default("Promo Kit MCP"),
  summary: z
    .string()
    .default("Research, poster generation, and voiceover tools for a workshop."),
});

export type ProductSearchResultProps = z.infer<typeof propSchema>;

export type AccordionItemProps = {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
};
