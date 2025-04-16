export interface Slide {
  title: string
  content: string
  figure?: string
}

export type NodeId = "purpose" | "how" | "involved" | "team"

export const slides: Record<NodeId, Slide[]> = {
  purpose: [
    {
      title: "Our Purpose",
      content: "We are a collective of artists, technologists, and designers who are passionate about mapping and visualizing the internet's infrastructure.",
      figure: "/figure1.png"
    },
    {
      title: "Why It Matters",
      content: "Understanding the internet's physical and logical infrastructure is crucial for building a more resilient and accessible digital future.",
    }
  ],
  how: [
    {
      title: "How does it work?",
      content: "We use a combination of data visualization, network mapping, and interactive tools to create comprehensive views of internet infrastructure.",
    },
    {
      title: "Our Methods",
      content: "Our process involves collecting data from various sources, analyzing network patterns, and creating interactive visualizations.",
      figure: "/figure2.png"
    }
  ],
  involved: [
    {
      title: "Get Involved",
      content: "Join our community of researchers, artists, and technologists in mapping the internet's infrastructure.",
    },
    {
      title: "How to Contribute",
      content: "You can contribute by sharing data, creating visualizations, or participating in our research projects.",
    }
  ],
  team: [
    {
      title: "Our Team",
      content: "We are a diverse group of professionals committed to making the internet's infrastructure more transparent and understandable.",
    },
    {
      title: "Join Us",
      content: "We're always looking for passionate individuals to join our team and contribute to this important work.",
    }
  ]
} 