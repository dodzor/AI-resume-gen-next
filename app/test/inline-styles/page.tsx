function StyledComponent() {
    const styles = {
      color: 'blue',
      fontSize: '20px',
      backgroundColor: '#f0f0f0',
      padding: '10px'
    }
    
    return (
      <div>
        {/* Style object */}
        <h1 style={styles}>Styled heading</h1>
        
        {/* Inline style object */}
        <p style={{ 
          color: 'red', 
          fontWeight: 'bold' 
        }}>
          Inline styled text
        </p>
        
        {/* Dynamic styles */}
        <div style={{
          backgroundColor: true ? 'green' : 'red',
          width: '100px',
          height: '100px'
        }} />
      </div>
    )
}

export default StyledComponent;