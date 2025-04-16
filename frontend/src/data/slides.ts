export interface Slide {
    title: string
    content: string
    figure?: string
  }
  
  export type NodeId = "purpose" | "how" | "involved" | "team"
  
  export const slides: Record<NodeId, Slide[]> = {
    purpose: [
      {
        title: "Mission Statement",
        content: "Now more than ever it is important to be conscious of spaces (digital or physical) that we inhibit. Internet Atlas is meant to instill awareness into time we spend on areas of the net and how that reflects something about us as people － what do we want our footprints to say about us? ",
      },
      {
        title: "About This Project",
        content: "Internet Atlas is an internet mapping project where we trace how users travel across websites, visualizing personal trends and larger emergent patterns in a coordinate map system that is user-defined. In a more poetic imagining of the web, we hope to create an insightful and interactive experience of reflecting on the time we spend.",
      }
    ],
    how: [
      {
        title: "How does it work?",
        content: "We use a combination of data visualization and machine learning tools to create comprehensive views of internet infrastructure.",
      },
      {
        title: "Step 1: Data Collection",
        content: "Our data comes from a open source market researchdataset of 1 million user sessions on the internet.",
        figure: "/figure2.png"
      },
      {
        title: "Step 2: Data Processing",
        content: "We use a combination of data visualization and machine learning tools to create comprehensive views of internet infrastructure.",
        figure: "/figure2.png"
      },
      
    ],
    involved: [
      {
        title: "Get Involved",
        content: "Email upennspark@gmail.com for more information on how to get involved with our projects.",
      }
    ],
    team: [
      {
        title: "Our Team",
        content: `We are part of Penn Spark, a student-run club at the University of Pennsylvania for tech and design. The team members are: Brandon, David, Eric, Estelle (PL), Fiona, Jimin, Joseph, and Ruth (PL).`,
      }
    ]
  }