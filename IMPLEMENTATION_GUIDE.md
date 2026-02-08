# Superhuman AI Chief of Staff - Implementation Guide

## Quick Start (For Hackathon)

### Prerequisites

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose
- OpenAI API key
- Neo4j (via Docker)

### 1. Initial Setup (10 minutes)

```bash
# Clone repository (or create new directory)
mkdir superhuman-ai-chief-of-staff
cd superhuman-ai-chief-of-staff

# Create project structure
mkdir -p backend/{api,agents,engines,processors,models,utils}
mkdir -p frontend/src/{components,visualizations,services}
mkdir -p database/{neo4j,migrations}
mkdir -p data
```

### 2. Backend Setup

#### Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install fastapi uvicorn openai neo4j python-dotenv asyncio pydantic
```

#### Environment Configuration

Create `.env` file:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here

# API
API_HOST=0.0.0.0
API_PORT=8000
```

#### Start Neo4j with Docker

```bash
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password_here \
  -v $PWD/data/neo4j:/data \
  neo4j:latest
```

Access Neo4j Browser at `http://localhost:7474`

### 3. Frontend Setup

```bash
cd frontend

# Initialize React app
npx create-react-app .

# Install dependencies
npm install vis-network axios
```

### 4. Data Preparation (Enron Dataset)

```bash
# Download Enron email dataset
cd data
wget https://www.cs.cmu.edu/~enron/enron_mail_20150507.tar.gz
tar -xzf enron_mail_20150507.tar.gz

# You'll now have a maildir structure with emails
```

### 5. Run the System

#### Terminal 1: Backend API

```bash
# From project root
source venv/bin/activate
cd backend
python -m uvicorn api.main:app --reload --port 8000
```

#### Terminal 2: Process Enron Data

```bash
# From project root
source venv/bin/activate
python processors/enron_processor.py
```

#### Terminal 3: Frontend

```bash
cd frontend
npm start
# Opens at http://localhost:3000
```

---

## Detailed Implementation Steps

### Step 1: Create FastAPI Backend

Create `backend/api/main.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
sys.path.append('..')

from agents.memory_agent import MemoryAgent
from agents.routing_agent import RoutingAgent
from agents.critic_agent import CriticAgent
from agents.synthesis_agent import SynthesisAgent
from engines.knowledge_graph import GraphDatabase
import openai
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Superhuman AI Chief of Staff")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize
graph = GraphDatabase(
    uri=os.getenv("NEO4J_URI"),
    user=os.getenv("NEO4J_USER"),
    password=os.getenv("NEO4J_PASSWORD")
)

openai.api_key = os.getenv("OPENAI_API_KEY")
llm_client = openai.AsyncOpenAI()

agents = {
    'memory': MemoryAgent(graph),
    'routing': RoutingAgent(graph),
    'critic': CriticAgent(graph, llm_client),
    'synthesis': SynthesisAgent(graph, llm_client)
}

# Models
class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = "default_user"

class MessageRequest(BaseModel):
    sender: str
    recipients: List[str]
    content: str
    type: str = "email"

# Routes
@app.get("/")
async def root():
    return {"message": "Superhuman AI Chief of Staff API"}

@app.get("/api/summary/daily")
async def get_daily_summary(user_id: str = "default_user"):
    """Get personalized daily summary."""
    summary = await agents['synthesis'].generate_daily_summary(user_id)
    return summary

@app.get("/api/conflicts")
async def get_conflicts():
    """Get active conflicts."""
    # Query all recent conflicts from graph
    conflicts = await graph.run("""
        MATCH (c:Conflict)
        WHERE c.resolved = false
        RETURN c
        ORDER BY c.severity DESC, c.created_at DESC
        LIMIT 10
    """)
    
    return [dict(record['c']) for record in conflicts]

@app.post("/api/query")
async def process_query(request: QueryRequest):
    """Process natural language query."""
    
    # Simple keyword-based routing for demo
    query_lower = request.query.lower()
    
    if "what changed" in query_lower or "update" in query_lower:
        summary = await agents['synthesis'].generate_daily_summary(request.user_id)
        return {"answer": summary['summary'], "type": "summary"}
    
    elif "conflict" in query_lower:
        # Get conflicts
        conflicts = await graph.run("""
            MATCH (c:Conflict)
            WHERE c.resolved = false
            RETURN count(c) as count
        """)
        count = conflicts[0]['count'] if conflicts else 0
        return {
            "answer": f"There are {count} active conflicts requiring attention.",
            "type": "conflict_count"
        }
    
    else:
        # General query - use LLM with graph context
        return {"answer": "Query processed (demo response)", "type": "general"}

@app.get("/api/graph/stats")
async def get_graph_stats():
    """Get knowledge graph statistics."""
    stats = await graph.run("""
        MATCH (n)
        RETURN 
            count(DISTINCT CASE WHEN n:Person THEN n END) as people,
            count(DISTINCT CASE WHEN n:Topic THEN n END) as topics,
            count(DISTINCT CASE WHEN n:Decision THEN n END) as decisions,
            count(DISTINCT CASE WHEN n:Message THEN n END) as messages
    """)
    
    return dict(stats[0]) if stats else {}

@app.get("/api/graph/network")
async def get_network_graph():
    """Get network graph data for visualization."""
    
    # Get nodes
    nodes_result = await graph.run("""
        MATCH (n)
        WHERE n:Person OR n:Topic OR n:Decision
        RETURN 
            id(n) as id,
            labels(n)[0] as label,
            n.name as name,
            n.title as title
        LIMIT 100
    """)
    
    nodes = []
    for record in nodes_result:
        nodes.append({
            'id': record['id'],
            'label': record['name'] or record['title'] or str(record['id']),
            'group': record['label'].lower()
        })
    
    # Get edges
    edges_result = await graph.run("""
        MATCH (a)-[r]->(b)
        WHERE (a:Person OR a:Topic OR a:Decision)
          AND (b:Person OR b:Topic OR b:Decision)
        RETURN 
            id(a) as from,
            id(b) as to,
            type(r) as label
        LIMIT 200
    """)
    
    edges = []
    for record in edges_result:
        edges.append({
            'from': record['from'],
            'to': record['to'],
            'label': record['label']
        })
    
    return {'nodes': nodes, 'edges': edges}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 2: Create Enron Processor

Create `backend/processors/enron_processor.py`:

```python
import email
import os
import re
import asyncio
from pathlib import Path
from datetime import datetime
import sys
sys.path.append('..')

from engines.knowledge_graph import GraphDatabase
from agents.memory_agent import MemoryAgent
from models.entities import Message
import openai
from dotenv import load_dotenv

load_dotenv()

class EnronProcessor:
    """Process Enron email dataset."""
    
    def __init__(self, enron_path: str, graph: GraphDatabase, llm_client):
        self.enron_path = Path(enron_path)
        self.graph = graph
        self.memory_agent = MemoryAgent(graph)
        self.llm = llm_client
        self.processed_count = 0
    
    async def process_mailbox(self, mailbox_path: Path, limit: int = 100):
        """Process emails from a single mailbox."""
        
        email_files = list(mailbox_path.rglob("*"))
        email_files = [f for f in email_files if f.is_file()][:limit]
        
        print(f"Processing {len(email_files)} emails from {mailbox_path.name}...")
        
        for email_file in email_files:
            try:
                await self.process_email(email_file)
                self.processed_count += 1
                
                if self.processed_count % 10 == 0:
                    print(f"Processed {self.processed_count} emails...")
                    
            except Exception as e:
                print(f"Error processing {email_file}: {e}")
    
    async def process_email(self, filepath: Path):
        """Process single email file."""
        
        with open(filepath, 'r', errors='ignore') as f:
            email_content = f.read()
        
        msg = email.message_from_string(email_content)
        
        # Extract data
        message_data = {
            'message_id': msg.get('Message-ID', str(filepath)),
            'sender': self.extract_email(msg.get('From', '')),
            'recipients': self.extract_emails(msg.get('To', '')),
            'subject': msg.get('Subject', ''),
            'date': self.parse_date(msg.get('Date')),
            'content': self.get_body(msg),
            'type': 'email'
        }
        
        if not message_data['sender'] or not message_data['content']:
            return
        
        # Create Message object
        message = Message(
            message_id=message_data['message_id'],
            sender=message_data['sender'],
            recipients=message_data['recipients'],
            content=message_data['content'][:2000],  # Limit content
            timestamp=message_data['date'],
            type='email'
        )
        
        # Extract entities (simplified for demo - skip LLM to save API calls)
        entities = self.simple_entity_extraction(message)
        
        # Update graph
        await self.memory_agent.update_graph(message, entities)
    
    def simple_entity_extraction(self, message: Message):
        """Simple entity extraction without LLM (for demo speed)."""
        from models.entities import Entity
        
        content_lower = message.content.lower()
        
        # Extract simple topics based on keywords
        topics = []
        keywords = ['meeting', 'project', 'budget', 'deadline', 'contract', 
                   'proposal', 'agreement', 'decision', 'schedule']
        
        for keyword in keywords:
            if keyword in content_lower:
                topics.append(keyword)
        
        return Entity(
            people=[],
            teams=[],
            topics=topics[:5],
            decisions=[],
            action_items=[],
            sentiment='neutral',
            urgency='medium'
        )
    
    def extract_email(self, email_str: str) -> str:
        """Extract email address."""
        match = re.search(r'[\w\.-]+@[\w\.-]+', email_str)
        return match.group(0).lower() if match else ""
    
    def extract_emails(self, emails_str: str) -> list:
        """Extract multiple email addresses."""
        matches = re.findall(r'[\w\.-]+@[\w\.-]+', emails_str)
        return [m.lower() for m in matches]
    
    def parse_date(self, date_str: str) -> datetime:
        """Parse email date."""
        if not date_str:
            return datetime.now()
        
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(date_str)
        except:
            return datetime.now()
    
    def get_body(self, msg) -> str:
        """Extract email body."""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        return part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    except:
                        return ""
        else:
            try:
                return msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            except:
                return ""
        return ""

async def main():
    """Main entry point."""
    
    # Initialize
    graph = GraphDatabase(
        uri=os.getenv("NEO4J_URI"),
        user=os.getenv("NEO4J_USER"),
        password=os.getenv("NEO4J_PASSWORD")
    )
    
    await graph.initialize_schema()
    
    openai.api_key = os.getenv("OPENAI_API_KEY")
    llm_client = openai.AsyncOpenAI()
    
    # Process Enron data
    enron_path = "../data/maildir"  # Adjust path as needed
    
    processor = EnronProcessor(enron_path, graph, llm_client)
    
    # Process first mailbox (e.g., allen-p)
    mailboxes = list(Path(enron_path).iterdir())
    if mailboxes:
        await processor.process_mailbox(mailboxes[0], limit=50)
    
    print(f"\nProcessing complete! Processed {processor.processed_count} emails.")
    
    # Show stats
    stats = await graph.run("""
        MATCH (n)
        RETURN 
            count(DISTINCT CASE WHEN n:Person THEN n END) as people,
            count(DISTINCT CASE WHEN n:Topic THEN n END) as topics,
            count(DISTINCT CASE WHEN n:Message THEN n END) as messages
    """)
    
    if stats:
        print("\nKnowledge Graph Stats:")
        print(f"  People: {stats[0]['people']}")
        print(f"  Topics: {stats[0]['topics']}")
        print(f"  Messages: {stats[0]['messages']}")
    
    await graph.close()

if __name__ == "__main__":
    asyncio.run(main())
```

### Step 3: Create Data Models

Create `backend/models/entities.py`:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict

@dataclass
class Message:
    message_id: str
    sender: str
    recipients: List[str]
    content: str
    timestamp: datetime
    type: str
    metadata: Optional[Dict] = None

@dataclass
class Decision:
    id: str
    title: str
    description: str
    status: str
    made_by: str
    made_at: datetime
    version: int = 1
    supersedes: Optional[str] = None

@dataclass
class Entity:
    people: List[str]
    teams: List[str]
    topics: List[str]
    decisions: List[Decision]
    action_items: List[Dict]
    sentiment: str
    urgency: str
    embedding: Optional[List[float]] = None

@dataclass
class Stakeholder:
    person_id: str
    priority: float
    reasons: List[str]
    defer_to: Optional[str] = None
```

Create `backend/engines/knowledge_graph.py`:

```python
from neo4j import AsyncGraphDatabase

class GraphDatabase:
    """Neo4j graph database interface."""
    
    def __init__(self, uri: str, user: str, password: str):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
    
    async def close(self):
        await self.driver.close()
    
    async def run(self, query: str, **params):
        """Execute Cypher query."""
        async with self.driver.session() as session:
            result = await session.run(query, **params)
            return [record async for record in result]
    
    async def initialize_schema(self):
        """Create indexes and constraints."""
        queries = [
            "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE",
            "CREATE CONSTRAINT message_id IF NOT EXISTS FOR (m:Message) REQUIRE m.id IS UNIQUE",
        ]
        
        for query in queries:
            try:
                await self.run(query)
            except Exception as e:
                pass  # Constraint may already exist
```

### Step 4: Testing

```bash
# Test backend API
curl http://localhost:8000/api/graph/stats

# Test query endpoint
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What changed today?"}'
```

---

## Demo Script

### Scene 1: Show Knowledge Graph

1. Open frontend at `http://localhost:3000`
2. Point to the central knowledge map
3. Explain: "This is the live organizational knowledge graph"
4. Click on nodes to show relationships

### Scene 2: Voice Query

1. Click the voice button (bottom right)
2. Say: "What changed today?"
3. System displays summary

### Scene 3: Conflict Detection

1. Point to the conflict sidebar
2. Explain how AI detected conflicts
3. Show resolution workflow

### Scene 4: Stakeholder Routing

1. Show a sample message
2. Explain: "AI identified 15 stakeholders who need to know"
3. Show priority distribution

---

## Troubleshooting

### Neo4j Connection Issues

```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Restart Neo4j
docker restart neo4j

# View logs
docker logs neo4j
```

### Frontend Not Loading

```bash
# Clear cache
rm -rf node_modules
npm install

# Restart dev server
npm start
```

### API Errors

```bash
# Check Python environment
which python
pip list

# Reinstall dependencies
pip install -r requirements.txt
```

---

## Next Steps for Production

1. **Authentication**: Add user authentication (OAuth, JWT)
2. **Real-time Updates**: WebSockets for live updates
3. **Scalability**: Kubernetes deployment, load balancing
4. **Advanced NLP**: Fine-tune models for entity extraction
5. **Mobile App**: React Native implementation
6. **Integrations**: Slack, Gmail, Calendar APIs
7. **Analytics**: Grafana dashboards for metrics
8. **Testing**: Comprehensive unit and integration tests

---

## Resources

- Neo4j Documentation: https://neo4j.com/docs/
- OpenAI API: https://platform.openai.com/docs
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Vis Network: https://visjs.github.io/vis-network/docs/network/

---

**Good luck with your hackathon! 🚀**
