import {describe,it,expect} from 'vitest';
import {createNotebook,upsertNotebookEntry} from './notebook';
import {retrieveNotebookContext} from './learningContext';
describe('personal note retrieval',()=>{
 it('finds a relevant older note across subjects instead of blindly sending recent notes',()=>{
  let notebook=createNotebook();
  notebook=upsertNotebookEntry(notebook,{title:'Rhythm and fractions',body:'I noticed equal subdivisions in a song.',kind:'idea',evidence:'encountered',nodeIds:['knowledge.arts'],sourceLabel:'',sourceUrl:''});
  notebook=upsertNotebookEntry(notebook,{title:'Ocean currents',body:'Warm surface water moves north.',kind:'idea',evidence:'encountered',nodeIds:['knowledge.earth'],sourceLabel:'',sourceUrl:''});
  expect(retrieveNotebookContext(notebook,'knowledge.mathematics','How does rhythm connect to fractions?').map(e=>e.title)).toEqual(['Rhythm and fractions']);
 });
 it('does not send unrelated notes with a specific question in a different territory',()=>{
  const notebook=upsertNotebookEntry(createNotebook(),{title:'A personal question',body:'A memory about home.',kind:'question',evidence:'encountered',nodeIds:['knowledge.humanities'],sourceLabel:'',sourceUrl:''});
  expect(retrieveNotebookContext(notebook,'knowledge.science','What is velocity?')).toEqual([]);
 });
});
