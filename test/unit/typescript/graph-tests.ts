import { Client, datastax } from "../../../index";
import GraphResultSet = datastax.graph.GraphResultSet;


/*
 * TypeScript definitions compilation tests for metadata module.
 */

async function myTest(client: Client): Promise<any> {
  let result: GraphResultSet;
  let cb = (err: Error, r: GraphResultSet) => {};

  // Promise-based API
  result = await client.executeGraph('g.V()');
  result = await client.executeGraph('g.V(id)', { id: 1});
  result = await client.executeGraph('g.V()', undefined, { executionProfile: 'ep1' });

  // Callback-based API
  await client.executeGraph('g.V()', cb);
  await client.executeGraph('g.V(id)', { id: 1}, cb);
  await client.executeGraph('g.V()', {}, { executionProfile: 'ep1' }, cb);

  let tokenString: string;
  tokenString = datastax.graph.t.id.toString();
  tokenString = datastax.graph.t.label.toString();
  tokenString = datastax.graph.direction.in_.toString();
  tokenString = datastax.graph.direction.out.toString();
  tokenString = datastax.graph.direction.both.toString();
}
