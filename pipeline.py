"""
Superhuman AI Chief of Staff - Main Pipeline Implementation
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import openai
from neo4j import AsyncGraphDatabase
import numpy as np

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class Message:
    message_id: str
    sender: str
    recipients: List[str]
    content: str
    timestamp: datetime
    type: str  # email, meeting, chat, voice_note, document
    metadata: Dict = None

@dataclass
class Decision:
    id: str
    title: str
    description: str
    status: str  # proposed, approved, rejected, implemented
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
    embedding: List[float] = None

@dataclass
class Stakeholder:
    person_id: str
    priority: float
    reasons: List[str]
    defer_to: Optional[str] = None

# ============================================================================
# GRAPH DATABASE INTERFACE
# ============================================================================

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
            "CREATE CONSTRAINT team_id IF NOT EXISTS FOR (t:Team) REQUIRE t.id IS UNIQUE",
            "CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE",
            "CREATE CONSTRAINT decision_id IF NOT EXISTS FOR (d:Decision) REQUIRE d.id IS UNIQUE",
            "CREATE CONSTRAINT message_id IF NOT EXISTS FOR (m:Message) REQUIRE m.id IS UNIQUE",
            "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)",
            "CREATE INDEX topic_name IF NOT EXISTS FOR (t:Topic) ON (t.name)",
            "CREATE INDEX message_timestamp IF NOT EXISTS FOR (m:Message) ON (m.timestamp)",
        ]
        
        for query in queries:
            try:
                await self.run(query)
            except Exception as e:
                print(f"Schema creation warning: {e}")

# ============================================================================
# AGENTS
# ============================================================================

class MemoryAgent:
    """Maintains organizational knowledge graph."""
    
    def __init__(self, graph: GraphDatabase):
        self.graph = graph
    
    async def update_graph(self, message: Message, entities: Entity):
        """Update knowledge graph with new information."""
        
        # Create/update people
        for person in entities.people:
            await self.graph.run("""
                MERGE (p:Person {id: $id})
                ON CREATE SET p.name = $name, p.first_seen = $timestamp
                ON MATCH SET p.last_seen = $timestamp
            """, id=self._normalize_email(person), name=person, timestamp=message.timestamp)
        
        # Create/update topics
        for topic in entities.topics:
            await self.graph.run("""
                MERGE (t:Topic {name: $name})
                ON CREATE SET t.first_mentioned = $timestamp
                ON MATCH SET t.last_updated = $timestamp
            """, name=topic, timestamp=message.timestamp)
        
        # Create message node
        await self.graph.run("""
            CREATE (m:Message {
                id: $id,
                sender_id: $sender,
                content: $content,
                timestamp: $timestamp,
                type: $type,
                sentiment: $sentiment,
                urgency: $urgency
            })
        """, 
            id=message.message_id,
            sender=self._normalize_email(message.sender),
            content=message.content[:1000],  # truncate
            timestamp=message.timestamp,
            type=message.type,
            sentiment=entities.sentiment,
            urgency=entities.urgency
        )
        
        # Link message to topics
        for topic in entities.topics:
            await self.graph.run("""
                MATCH (m:Message {id: $msg_id})
                MATCH (t:Topic {name: $topic})
                CREATE (m)-[:DISCUSSES]->(t)
            """, msg_id=message.message_id, topic=topic)
        
        # Link sender to recipients (communication pattern)
        for recipient in message.recipients:
            await self.graph.run("""
                MATCH (sender:Person {id: $sender})
                MATCH (recipient:Person {id: $recipient})
                MERGE (sender)-[r:COMMUNICATES_WITH]->(recipient)
                ON CREATE SET r.frequency = 1, r.last_contact = $timestamp
                ON MATCH SET r.frequency = r.frequency + 1, r.last_contact = $timestamp
            """, 
                sender=self._normalize_email(message.sender),
                recipient=self._normalize_email(recipient),
                timestamp=message.timestamp
            )
        
        # Create decisions with versioning
        for decision in entities.decisions:
            await self._create_decision(decision)
    
    async def _create_decision(self, decision: Decision):
        """Create decision node with versioning."""
        # Check if similar decision exists
        similar = await self.graph.run("""
            MATCH (d:Decision)
            WHERE d.title =~ $pattern
            RETURN d
            ORDER BY d.version DESC
            LIMIT 1
        """, pattern=f"(?i).*{decision.title[:20]}.*")
        
        if similar:
            # New version
            decision.version = similar[0]['d']['version'] + 1
            decision.supersedes = similar[0]['d']['id']
        
        # Create decision node
        await self.graph.run("""
            CREATE (d:Decision {
                id: $id,
                title: $title,
                description: $description,
                status: $status,
                made_by: $made_by,
                made_at: $made_at,
                version: $version,
                supersedes: $supersedes
            })
        """, **decision.__dict__)
    
    def _normalize_email(self, email: str) -> str:
        """Normalize email to lowercase for consistency."""
        return email.lower().strip() if email else ""


class RoutingAgent:
    """Determines who needs to receive information."""
    
    def __init__(self, graph: GraphDatabase):
        self.graph = graph
    
    async def identify_stakeholders(
        self, 
        message: Message, 
        entities: Entity
    ) -> List[Stakeholder]:
        """Identify all stakeholders who should receive this information."""
        stakeholders = []
        
        # 1. Direct recipients (priority 1.0)
        for recipient in message.recipients:
            stakeholders.append(Stakeholder(
                person_id=self._normalize_email(recipient),
                priority=1.0,
                reasons=['direct_recipient']
            ))
        
        # 2. Topic subscribers (priority 0.7)
        for topic in entities.topics:
            interested = await self.graph.run("""
                MATCH (p:Person)-[:INTERESTED_IN]->(t:Topic {name: $topic})
                RETURN p.id as person_id
            """, topic=topic)
            
            for person in interested:
                stakeholders.append(Stakeholder(
                    person_id=person['person_id'],
                    priority=0.7,
                    reasons=[f'interested_in_{topic}']
                ))
        
        # 3. People who frequently communicate with sender (priority 0.5)
        frequent_contacts = await self.graph.run("""
            MATCH (sender:Person {id: $sender})-[r:COMMUNICATES_WITH]->(contact:Person)
            WHERE r.frequency > 10
            RETURN contact.id as person_id, r.frequency as freq
            ORDER BY r.frequency DESC
            LIMIT 10
        """, sender=self._normalize_email(message.sender))
        
        for contact in frequent_contacts:
            stakeholders.append(Stakeholder(
                person_id=contact['person_id'],
                priority=0.5,
                reasons=['frequent_contact']
            ))
        
        # Consolidate duplicates
        stakeholders = self._consolidate_stakeholders(stakeholders)
        
        # Apply overload prevention
        stakeholders = await self._prevent_overload(stakeholders)
        
        return stakeholders
    
    def _consolidate_stakeholders(self, stakeholders: List[Stakeholder]) -> List[Stakeholder]:
        """Merge duplicate stakeholders and combine priorities."""
        consolidated = {}
        
        for s in stakeholders:
            if s.person_id in consolidated:
                # Take max priority
                consolidated[s.person_id].priority = max(
                    consolidated[s.person_id].priority,
                    s.priority
                )
                # Combine reasons
                consolidated[s.person_id].reasons.extend(s.reasons)
            else:
                consolidated[s.person_id] = s
        
        return list(consolidated.values())
    
    async def _prevent_overload(self, stakeholders: List[Stakeholder]) -> List[Stakeholder]:
        """Prevent overwhelming stakeholders with too many notifications."""
        yesterday = datetime.now() - timedelta(days=1)
        
        for s in stakeholders:
            # Check notification count in last 24 hours
            result = await self.graph.run("""
                MATCH (:Person {id: $person_id})<-[:NOTIFIED]-(n:Notification)
                WHERE n.timestamp > $yesterday
                RETURN count(n) as count
            """, person_id=s.person_id, yesterday=yesterday)
            
            count = result[0]['count'] if result else 0
            
            # If overloaded, defer low-priority items
            if count > 20 and s.priority < 0.5:
                s.defer_to = 'weekly_digest'
            elif count > 50 and s.priority < 0.8:
                s.defer_to = 'daily_digest'
        
        return stakeholders
    
    def _normalize_email(self, email: str) -> str:
        return email.lower().strip() if email else ""


class CriticAgent:
    """Detects conflicts, inconsistencies, and knowledge gaps."""
    
    def __init__(self, graph: GraphDatabase, llm_client):
        self.graph = graph
        self.llm = llm_client
    
    async def detect_conflicts(self, entities: Entity) -> List[Dict]:
        """Detect conflicts with existing knowledge."""
        conflicts = []
        
        # Check decision conflicts
        for decision in entities.decisions:
            decision_conflicts = await self._detect_decision_conflicts(decision)
            conflicts.extend(decision_conflicts)
        
        return conflicts
    
    async def _detect_decision_conflicts(self, decision: Decision) -> List[Dict]:
        """Detect if a new decision conflicts with existing ones."""
        cutoff_date = datetime.now() - timedelta(days=90)
        
        # Get potentially conflicting decisions
        candidates = await self.graph.run("""
            MATCH (d:Decision)
            WHERE d.id <> $new_id
              AND d.status IN ['approved', 'implemented']
              AND d.made_at > $cutoff_date
            RETURN d.id as id, d.title as title, d.description as description
            LIMIT 20
        """, new_id=decision.id, cutoff_date=cutoff_date)
        
        conflicts = []
        
        for candidate in candidates:
            # Use LLM to determine if there's a real conflict
            conflict_analysis = await self._analyze_conflict(
                decision.description,
                candidate['description']
            )
            
            if conflict_analysis.get('has_conflict'):
                conflicts.append({
                    'decision_id': candidate['id'],
                    'type': conflict_analysis['conflict_type'],
                    'severity': conflict_analysis['severity'],
                    'explanation': conflict_analysis['explanation']
                })
        
        return conflicts
    
    async def _analyze_conflict(self, desc1: str, desc2: str) -> Dict:
        """Use LLM to detect semantic conflicts."""
        prompt = f"""Analyze these two decisions for conflicts:

Decision 1: {desc1}
Decision 2: {desc2}

Determine:
1. Is there a conflict? (yes/no)
2. If yes, what type? (contradiction/overlap/dependency/resource_contention)
3. Severity? (critical/high/medium/low)
4. Explanation (1-2 sentences)

Return JSON with keys: has_conflict, conflict_type, severity, explanation"""
        
        try:
            response = await self.llm.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Error analyzing conflict: {e}")
            return {'has_conflict': False}


class SynthesisAgent:
    """Generates summaries, context packages, and visualizations."""
    
    def __init__(self, graph: GraphDatabase, llm_client):
        self.graph = graph
        self.llm = llm_client
    
    async def generate_daily_summary(self, person_id: str) -> Dict:
        """Generate personalized daily summary for a person."""
        yesterday = datetime.now() - timedelta(days=1)
        
        # Get relevant changes
        changes = await self.graph.run("""
            MATCH (p:Person {id: $person_id})
            
            // Messages in topics they're interested in
            OPTIONAL MATCH (p)-[:INTERESTED_IN]->(topic:Topic)<-[:DISCUSSES]-(m:Message)
            WHERE m.timestamp > $yesterday
            
            // Recent decisions
            OPTIONAL MATCH (d:Decision)
            WHERE d.made_at > $yesterday
            
            RETURN collect(DISTINCT m) as messages, collect(DISTINCT d) as decisions
        """, person_id=person_id, yesterday=yesterday)
        
        if not changes:
            return {'summary': 'No significant updates in the last 24 hours.'}
        
        # Format data for LLM
        messages = changes[0].get('messages', [])
        decisions = changes[0].get('decisions', [])
        
        summary_data = {
            'message_count': len(messages),
            'decision_count': len(decisions),
            'messages': [m['content'][:200] for m in messages[:10]],
            'decisions': [{'title': d['title'], 'status': d['status']} for d in decisions]
        }
        
        # Generate summary
        prompt = f"""Generate a concise daily summary for a team member based on these updates:

Messages: {summary_data['message_count']} new messages
Decisions: {summary_data['decision_count']} new decisions

Key messages:
{chr(10).join(f"- {m}" for m in summary_data['messages'])}

Decisions:
{chr(10).join(f"- {d['title']} ({d['status']})" for d in summary_data['decisions'])}

Create a 2-3 sentence executive summary highlighting what's most important."""
        
        try:
            response = await self.llm.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            
            return {
                'summary': response.choices[0].message.content,
                'message_count': summary_data['message_count'],
                'decision_count': summary_data['decision_count']
            }
        except Exception as e:
            return {'summary': f'Error generating summary: {e}'}

# ============================================================================
# MAIN PIPELINE
# ============================================================================

class InformationIngestionPipeline:
    """Main pipeline for ingesting and processing organizational communication."""
    
    def __init__(self, graph: GraphDatabase, llm_client):
        self.graph = graph
        self.llm = llm_client
        self.agents = {
            'memory': MemoryAgent(graph),
            'routing': RoutingAgent(graph),
            'critic': CriticAgent(graph, llm_client),
            'synthesis': SynthesisAgent(graph, llm_client)
        }
    
    async def process_message(self, message: Message) -> Dict:
        """Main entry point for processing any communication."""
        
        print(f"Processing message: {message.message_id}")
        
        # 1. Extract structured data
        entities = await self.extract_entities(message)
        
        # 2. Update knowledge graph
        await self.agents['memory'].update_graph(message, entities)
        
        # 3. Check for conflicts
        conflicts = await self.agents['critic'].detect_conflicts(entities)
        
        # 4. Determine routing
        stakeholders = await self.agents['routing'].identify_stakeholders(
            message, 
            entities
        )
        
        # 5. Log processing
        print(f"  Extracted: {len(entities.topics)} topics, {len(entities.decisions)} decisions")
        print(f"  Conflicts: {len(conflicts)}")
        print(f"  Stakeholders: {len(stakeholders)}")
        
        return {
            'entities': entities,
            'stakeholders': stakeholders,
            'conflicts': conflicts
        }
    
    async def extract_entities(self, message: Message) -> Entity:
        """Extract people, topics, decisions from message."""
        
        prompt = f"""Extract structured information from this message:

From: {message.sender}
To: {', '.join(message.recipients)}
Type: {message.type}
Content: {message.content}

Extract and return JSON with:
- people: [list of mentioned people - names or email addresses]
- teams: [list of mentioned teams or departments]
- topics: [list of key topics discussed - 2-5 words each]
- decisions: [list of decisions made, each with: title, description, status (proposed/approved/rejected)]
- action_items: [list of action items mentioned]
- sentiment: overall sentiment (positive/neutral/negative)
- urgency: level (low/medium/high/critical)

Only include what's explicitly mentioned. Be concise."""
        
        try:
            response = await self.llm.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            data = json.loads(response.choices[0].message.content)
            
            # Convert decisions to Decision objects
            decisions = []
            for d in data.get('decisions', []):
                decisions.append(Decision(
                    id=f"dec_{datetime.now().timestamp()}_{hash(d['title'])}",
                    title=d['title'],
                    description=d.get('description', ''),
                    status=d.get('status', 'proposed'),
                    made_by=message.sender,
                    made_at=message.timestamp
                ))
            
            return Entity(
                people=data.get('people', []),
                teams=data.get('teams', []),
                topics=data.get('topics', []),
                decisions=decisions,
                action_items=data.get('action_items', []),
                sentiment=data.get('sentiment', 'neutral'),
                urgency=data.get('urgency', 'medium')
            )
            
        except Exception as e:
            print(f"Error extracting entities: {e}")
            return Entity(
                people=[],
                teams=[],
                topics=[],
                decisions=[],
                action_items=[],
                sentiment='neutral',
                urgency='medium'
            )


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

async def main():
    """Example usage."""
    
    # Initialize
    graph = GraphDatabase(
        uri="bolt://localhost:7687",
        user="neo4j",
        password="password"
    )
    
    await graph.initialize_schema()
    
    llm_client = openai.AsyncOpenAI(api_key="your-api-key")
    
    pipeline = InformationIngestionPipeline(graph, llm_client)
    
    # Example message
    message = Message(
        message_id="msg_001",
        sender="alice@example.com",
        recipients=["bob@example.com", "charlie@example.com"],
        content="""
        Team,
        
        After our meeting today, we've decided to migrate to microservices architecture.
        This will affect the backend, DevOps, and frontend teams. 
        
        Bob will lead the migration starting next month.
        
        Please review the attached design doc and provide feedback by Friday.
        
        Alice
        """,
        timestamp=datetime.now(),
        type="email"
    )
    
    # Process
    result = await pipeline.process_message(message)
    
    print("\n=== Processing Result ===")
    print(f"Topics: {result['entities'].topics}")
    print(f"Decisions: {[d.title for d in result['entities'].decisions]}")
    print(f"Stakeholders: {len(result['stakeholders'])}")
    print(f"Conflicts: {len(result['conflicts'])}")
    
    await graph.close()


if __name__ == "__main__":
    asyncio.run(main())
