import { useState } from 'react'

const Sidebar = ({ collections, tags, currentFilter, onFilterChange }) => {
  const [expandedCollections, setExpandedCollections] = useState(new Set())

  const toggleCollection = (collectionId) => {
    const newExpanded = new Set(expandedCollections)
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId)
    } else {
      newExpanded.add(collectionId)
    }
    setExpandedCollections(newExpanded)
  }

  const handleFilterClick = (filter) => {
    onFilterChange(filter)
  }

  const renderCollectionTree = (items, depth = 0) => {
    return items.map(collection => (
      <div key={collection._id}>
        <div 
          className='sidebar-collection-item'
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <button
            className='expand-btn'
            onClick={() => toggleCollection(collection._id)}
            style={{ visibility: collection.children?.length > 0 ? 'visible' : 'hidden' }}
          >
            {expandedCollections.has(collection._id) ? '▼' : '▶'}
          </button>
          <button
            className={`collection-name ${currentFilter.type === 'collection' && currentFilter.id === collection._id ? 'active' : ''}`}
            onClick={() => handleFilterClick({ type: 'collection', id: collection._id })}
          >
            {collection.name}
          </button>
        </div>
        {expandedCollections.has(collection._id) && collection.children?.length > 0 && (
          <div>
            {renderCollectionTree(collection.children, depth + 1)}
          </div>
        )}
      </div>
    ))
  }

  return (
    <aside className='sidebar'>
      <div className='sidebar-section'>
        <h3 className='sidebar-title'>Views</h3>
        <button
          className={`sidebar-item ${currentFilter.type === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterClick({ type: 'all' })}
        >
          All Links
        </button>
        <button
          className={`sidebar-item ${currentFilter.type === 'favorite' ? 'active' : ''}`}
          onClick={() => handleFilterClick({ type: 'favorite' })}
        >
          ★ Favorites
        </button>
        <button
          className={`sidebar-item ${currentFilter.type === 'archive' ? 'active' : ''}`}
          onClick={() => handleFilterClick({ type: 'archive' })}
        >
          Archive
        </button>
      </div>

      {collections && collections.length > 0 && (
        <div className='sidebar-section'>
          <h3 className='sidebar-title'>Collections</h3>
          <div className='sidebar-collections'>
            {renderCollectionTree(collections)}
          </div>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className='sidebar-section'>
          <h3 className='sidebar-title'>Tags</h3>
          <div className='sidebar-tags'>
            {tags.map((tag, idx) => (
              <button
                key={idx}
                className={`sidebar-tag ${currentFilter.type === 'tag' && currentFilter.value === tag.name ? 'active' : ''}`}
                onClick={() => handleFilterClick({ type: 'tag', value: tag.name })}
              >
                {tag.name} <span className='tag-count'>({tag.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
